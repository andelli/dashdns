const pool = require('../db/postgres')
const dnsdistCollector = require('../collectors/dnsdistCollector')
const { parseStats } = require('../services/dnsdistParser')

async function collectDnsdist() {
  const servers = await pool.query(`
    SELECT * FROM servers WHERE type = 'dnsdist' AND enabled = true
  `)

  for (const server of servers.rows) {
    try {
      console.log(`[Collector] Collecting dnsdist: ${server.hostname} (${server.ip})`)

      const stats = await dnsdistCollector.collect(server.ip, server.api_port, server.api_key)
      if (!stats) continue

      const parsed = parseStats(stats)

      // Calculate QPS delta from previous record
      const lastRecord = await pool.query(`
        SELECT queries FROM dnsdist_stats
        WHERE server_id = $1
        ORDER BY ts DESC LIMIT 1
      `, [server.id])

      let queriesDelta = 0
      if (lastRecord.rows.length > 0) {
        const prevQueries = Number(lastRecord.rows[0].queries)
        const diff = Number(parsed.queries) - prevQueries
        queriesDelta = diff > 0 ? Math.round(diff / 10) : 0 // 10s interval = QPS
      }

      await pool.query(`
        INSERT INTO dnsdist_stats (
          server_id, ts, queries, queries_delta,
          cache_hits, cache_misses, cache_hit_ratio,
          nxdomain, servfail,
          latency_avg, latency_tcp, latency_udp,
          real_memory_usage, cpu_user, cpu_system,
          frontend_nhqueries, downstreams_timeout,
          acl_drops, rule_drop, rule_nxdomain
        ) VALUES (
          $1, NOW() AT TIME ZONE 'Asia/Jakarta', $2, $3,
          $4, $5, $6,
          $7, $8,
          $9, $10, $11,
          $12, $13, $14,
          $15, $16,
          $17, $18, $19
        )
      `, [
        server.id, parsed.queries, queriesDelta,
        parsed.cacheHits, parsed.cacheMisses, parsed.cacheHitRatio,
        parsed.nxdomain, parsed.servfail,
        parsed.latencyAvg, parsed.latencyTcp, parsed.latencyUdp,
        parsed.memory, parsed.cpuUser, parsed.cpuSystem,
        parsed.frontendNhqueries, parsed.downstreamsTimeout,
        parsed.aclDrops, parsed.ruleDrop, parsed.ruleNxdomain
      ])

      console.log(`[Collector] dnsdist ${server.hostname}: QPS=${queriesDelta}, CacheHit=${parsed.cacheHitRatio.toFixed(1)}%`)
    } catch (err) {
      console.error(`[Collector] dnsdist ${server.hostname} error:`, err.message)
    }
  }
}

module.exports = { collectDnsdist }
