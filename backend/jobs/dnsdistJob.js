const pool = require('../db/postgres')
const dnsdistCollector = require('../collectors/dnsdistCollector')
const { parseStats } = require('../services/dnsdistParser')

async function collectDnsdist() {
  const servers = await pool.query(`
    SELECT * FROM servers WHERE type = 'dnsdist' AND enabled = true
  `)

  const now = new Date()

  const results = await Promise.allSettled(servers.rows.map(async (server) => {
    try {
      const stats = await dnsdistCollector.collect(server.ip, server.api_port, server.api_key)
      if (!stats) return

      const parsed = parseStats(stats)

      // Calculate QPS delta from previous record
      const lastRecord = await pool.query(`
        SELECT queries, nxdomain, servfail, downstreams_timeout, acl_drops FROM dnsdist_stats
        WHERE server_id = $1
        ORDER BY id DESC LIMIT 1
      `, [server.id])

      const calcDelta = (curr, field) => {
        if (lastRecord.rows.length === 0) return 0
        const prev = Number(lastRecord.rows[0][field] || 0)
        const diff = Number(curr) - prev
        return diff > 0 ? Math.round(diff / 10) : 0
      }

      const queriesDelta = calcDelta(parsed.queries, 'queries')
      const nxdomainDelta = calcDelta(parsed.nxdomain, 'nxdomain')
      const servfailDelta = calcDelta(parsed.servfail, 'servfail')
      const downstreamsTimeoutDelta = calcDelta(parsed.downstreamsTimeout, 'downstreams_timeout')
      const aclDropsDelta = calcDelta(parsed.aclDrops, 'acl_drops')

      await pool.query(`
        INSERT INTO dnsdist_stats (
          server_id, ts, queries, queries_delta,
          nxdomain, nxdomain_delta,
          servfail, servfail_delta,
          downstreams_timeout, downstreams_timeout_delta,
          acl_drops, acl_drops_delta,
          cache_hits, cache_misses, cache_hit_ratio,
          latency_avg, latency_tcp, latency_udp,
          real_memory_usage, cpu_user, cpu_system,
          frontend_nhqueries, rule_drop, rule_nxdomain
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6,
          $7, $8,
          $9, $10,
          $11, $12,
          $13, $14, $15,
          $16, $17, $18,
          $19, $20, $21,
          $22, $23, $24
        )
      `, [
        server.id, now, parsed.queries, queriesDelta,
        parsed.nxdomain, nxdomainDelta,
        parsed.servfail, servfailDelta,
        parsed.downstreamsTimeout, downstreamsTimeoutDelta,
        parsed.aclDrops, aclDropsDelta,
        parsed.cacheHits, parsed.cacheMisses, parsed.cacheHitRatio,
        parsed.latencyAvg, parsed.latencyTcp, parsed.latencyUdp,
        parsed.memory, parsed.cpuUser, parsed.cpuSystem,
        parsed.frontendNhqueries, parsed.ruleDrop, parsed.ruleNxdomain
      ])

      console.log(`[Collector] dnsdist ${server.hostname}: QPS=${queriesDelta}, SERVFAIL/s=${servfailDelta}, Timeout/s=${downstreamsTimeoutDelta}`)
    } catch (err) {
      console.error(`[Collector] dnsdist ${server.hostname} error:`, err.message)
    }
  }))
}

module.exports = { collectDnsdist }
