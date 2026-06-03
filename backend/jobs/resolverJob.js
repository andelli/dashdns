const pool = require('../db/postgres')
const net = require('net')
const axios = require('axios')

// Check if a port is open on a host and measure response time
function checkPort(host, port, timeout = 5000) {
  return new Promise((resolve) => {
    const startTime = Date.now()
    const socket = new net.Socket()
    let resolved = false

    socket.setTimeout(timeout)

    socket.on('connect', () => {
      const responseTime = Date.now() - startTime
      socket.destroy()
      if (!resolved) { resolved = true; resolve({ up: true, responseTime }) }
    })

    socket.on('timeout', () => {
      socket.destroy()
      if (!resolved) { resolved = true; resolve({ up: false, responseTime: timeout }) }
    })

    socket.on('error', () => {
      socket.destroy()
      if (!resolved) { resolved = true; resolve({ up: false, responseTime: 0 }) }
    })

    socket.connect(port, host)
  })
}

// Collect stats from custom /stats endpoint on port 9000
async function collectPdnsStats(ip, port, apiKey) {
  try {
    const response = await axios.get(
      `http://${ip}:${port}/stats`,
      {
        headers: apiKey ? { 'X-API-Key': apiKey } : {},
        timeout: 5000
      }
    )
    
    // Response is a direct JSON object, not an array
    const data = response.data
    
    return {
      queries: data.questions || 0,
      cacheHits: data.cache_hits || 0,
      cacheMisses: data.cache_misses || 0,
      cacheRatio: data.cache_ratio || 0,
      packetCacheHits: data.packetcache_hits || 0,
      packetCacheMisses: data.packetcache_misses || 0,
      packetCacheRatio: data.packetcache_ratio || 0,
      nxdomain: data.nxdomain || 0,
      servfail: data.servfail || 0,
      latency: (data.latency || 0) / 1000,
      memoryBytes: data.memory_bytes || 0,
      concurrentQueries: data.concurrent_queries || 0,
      outgoingTimeouts: data.outgoing_timeouts || 0,
      uptime: data.uptime || 0,
      fdUsage: data.fd_usage || 0,
      tcpClients: data.tcp_clients || 0,
      securityStatus: data.security_status || 0
    }
  } catch (err) {
    return null
  }
}

async function collectResolver() {
  const servers = await pool.query(`
    SELECT * FROM servers WHERE type = 'resolver' AND enabled = true
  `)

  const now = new Date()

  await Promise.allSettled(servers.rows.map(async (server) => {
    try {
      console.log(`[Collector] Collecting resolver: ${server.hostname} (${server.ip})`)

      // Try custom /stats endpoint on port 9000
      const pdnsPort = 9000
      const pdnsStats = await collectPdnsStats(server.ip, pdnsPort, server.api_key || process.env.DNSDIST_API_KEY)
      
      if (pdnsStats) {
        // Calculate deltas
        const lastRecord = await pool.query(`
          SELECT queries, nxdomain, servfail, outgoing_timeouts FROM resolver_stats
          WHERE server_id = $1 ORDER BY id DESC LIMIT 1
        `, [server.id])

        const calcDelta = (curr, field) => {
          if (lastRecord.rows.length === 0) return 0
          const prev = Number(lastRecord.rows[0][field] || 0)
          const diff = Number(curr) - prev
          return diff > 0 ? Math.round(diff / 10) : 0
        }

        const queriesDelta = calcDelta(pdnsStats.queries, 'queries')
        const nxdomainDelta = calcDelta(pdnsStats.nxdomain, 'nxdomain')
        const servfailDelta = calcDelta(pdnsStats.servfail, 'servfail')
        const timeoutsDelta = calcDelta(pdnsStats.outgoingTimeouts, 'outgoing_timeouts')

        await pool.query(`
          INSERT INTO resolver_stats (
            server_id, ts, is_up, response_time,
            queries, queries_delta,
            nxdomain, nxdomain_delta,
            servfail, servfail_delta,
            timeouts, timeouts_delta,
            cache_hits, cache_misses, cache_hit_ratio,
            packet_cache_hits, packet_cache_misses, packet_cache_size,
            latency_avg, memory_usage,
            cpu_user, cpu_system,
            concurrent_queries, outgoing_timeouts
          ) VALUES (
            $1, $2, true, 0,
            $3, $4,
            $5, $6,
            $7, $8,
            $9, $10,
            $11, $12, $13, $14, $15, $16,
            $17, $18,
            0, 0,
            $19, $20
          )
        `, [
          server.id, now,
          pdnsStats.queries, queriesDelta,
          pdnsStats.nxdomain, nxdomainDelta,
          pdnsStats.servfail, servfailDelta,
          pdnsStats.outgoingTimeouts, timeoutsDelta,
          pdnsStats.cacheHits, pdnsStats.cacheMisses, pdnsStats.cacheRatio,
          pdnsStats.packetCacheHits, pdnsStats.packetCacheMisses, 0,
          pdnsStats.latency, pdnsStats.memoryBytes,
          pdnsStats.concurrentQueries, pdnsStats.outgoingTimeouts
        ])

        console.log(`[Collector] ✓ ${server.hostname} port 9000: QPS=${queriesDelta}, SERVFAIL/s=${servfailDelta}, Timeout/s=${timeoutsDelta}`)
      } else {
        // Fallback: ambil last known values agar grafik tidak putus
        const lastKnown = await pool.query(`
          SELECT queries_delta as qps, cache_hit_ratio, queries,
                 cache_hits, cache_misses, latency_avg, memory_usage,
                 nxdomain, servfail, concurrent_queries, timeouts
          FROM resolver_stats
          WHERE server_id = $1 AND queries_delta IS NOT NULL
          ORDER BY id DESC LIMIT 1
        `, [server.id])

        const lk = lastKnown.rows[0] || {}

        // Fallback port check
        let portToCheck = 53
        let result = await checkPort(server.ip, portToCheck)

        if (!result.up) {
          const altPort = 5353
          console.log(`[Collector] Port ${portToCheck} down, trying alternate port ${altPort}...`)
          result = await checkPort(server.ip, altPort)
          if (result.up) portToCheck = altPort
        }

        await pool.query(`
          INSERT INTO resolver_stats (
            server_id, ts, is_up, response_time,
            queries, queries_delta, cache_hit_ratio,
            cache_hits, cache_misses,
            nxdomain, servfail, timeouts,
            latency_avg, memory_usage,
            concurrent_queries
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7,
            $8, $9,
            $10, $11, $12,
            $13, $14,
            $15
          )
        `, [
          server.id, now, result.up, result.responseTime,
          lk.queries || 0, lk.qps || 0, lk.cache_hit_ratio || 0,
          lk.cache_hits || 0, lk.cache_misses || 0,
          lk.nxdomain || 0, lk.servfail || 0, lk.timeouts || 0,
          lk.latency_avg || 0, lk.memory_usage || 0,
          lk.concurrent_queries || 0
        ])

        if (result.up) {
          console.log(`[Collector] ✓ ${server.hostname} port ${portToCheck} UP (${result.responseTime}ms) - no stats API`)
        } else {
          console.log(`[Collector] ✗ ${server.hostname} ports 53/5353/9000 all DOWN`)
        }
      }
    } catch (err) {
      console.error(`[Collector] resolver ${server.hostname} error:`, err.message)
    }
  }))
}

module.exports = { collectResolver }
