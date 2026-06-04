const express = require('express')
const router = express.Router()
const pool = require('../db/postgres')
const { authenticateToken } = require('../middleware/auth')

router.use(authenticateToken)

// GET /api/dashboard/overview - Summary of all servers
router.get('/overview', async (req, res) => {
  try {
    // Get dnsdist summary
    const dnsdistSummary = await pool.query(`
      SELECT
        s.id, s.hostname, s.ip, s.api_port,
        ds.queries_delta as qps,
        ds.cache_hit_ratio,
        ds.latency_avg,
        ds.real_memory_usage as memory,
        ds.nxdomain, ds.nxdomain_delta,
        ds.servfail, ds.servfail_delta,
        ds.downstreams_timeout, ds.downstreams_timeout_delta,
        ds.acl_drops, ds.acl_drops_delta,
        ds.queries, ds.cache_hits, ds.cache_misses,
        ds.ts
      FROM servers s
      LEFT JOIN LATERAL (
        SELECT * FROM dnsdist_stats
        WHERE server_id = s.id
        ORDER BY id DESC LIMIT 1
      ) ds ON true
      WHERE s.type = 'dnsdist' AND s.enabled = true
      ORDER BY s.hostname
    `)

    // Get resolver summary
    const resolverSummary = await pool.query(`
      SELECT
        s.id, s.hostname, s.ip, s.api_port,
        rs.queries_delta as qps,
        rs.cache_hit_ratio,
        rs.packet_cache_hits, rs.packet_cache_misses,
        rs.latency_avg,
        rs.memory_usage as memory,
        rs.nxdomain, rs.nxdomain_delta,
        rs.servfail, rs.servfail_delta,
        rs.timeouts, rs.timeouts_delta,
        rs.queries, rs.cache_hits, rs.cache_misses,
        rs.concurrent_queries,
        COALESCE(rs.is_up, false) as is_up,
        rs.ts
      FROM servers s
      LEFT JOIN LATERAL (
        SELECT * FROM resolver_stats
        WHERE server_id = s.id
        ORDER BY id DESC LIMIT 1
      ) rs ON true
      WHERE s.type = 'resolver' AND s.enabled = true
      ORDER BY s.hostname
    `)

    // Calculate totals
    const dnsdistRows = dnsdistSummary.rows
    const resolverRows = resolverSummary.rows

    // Total QPS should only count dnsdist (entry point) to avoid double-counting
    // Flow: Client → dnsdist → resolvers
    const totalQps = dnsdistRows
      .map(r => Number(r.qps) || 0)
      .reduce((a, b) => a + b, 0)

    const totalQueries = dnsdistRows
      .map(r => Number(r.queries) || 0)
      .reduce((a, b) => a + b, 0)

    // Memory is infrastructure-wide, so we can combine both
    const totalMemory = [
      ...dnsdistRows.map(r => Number(r.memory) || 0),
      ...resolverRows.map(r => Number(r.memory) || 0)
    ].reduce((a, b) => a + b, 0)

    // Cache hit ratios should be shown separately for frontend (dnsdist) and backend (resolvers)
    const dnsdistCacheHit = dnsdistRows.length > 0
      ? dnsdistRows.reduce((sum, r) => sum + Number(r.cache_hit_ratio || 0), 0) / dnsdistRows.length
      : 0

    const resolverCacheHit = resolverRows.length > 0
      ? resolverRows.reduce((sum, r) => sum + Number(r.cache_hit_ratio || 0), 0) / resolverRows.length
      : 0

    res.json({
      totals: {
        servers: dnsdistRows.length + resolverRows.length,
        totalQps: Math.round(totalQps),
        totalQueries,
        totalMemory,
        dnsdistCacheHit: Math.round(dnsdistCacheHit * 100) / 100,
        resolverCacheHit: Math.round(resolverCacheHit * 100) / 100
      },
      dnsdist: dnsdistRows,
      resolvers: resolverRows
    })
  } catch (err) {
    console.error('Dashboard overview error:', err)
    res.status(500).json({ error: 'Failed to get overview' })
  }
})

// GET /api/dashboard/qps - QPS history for all servers
router.get('/qps', async (req, res) => {
  try {
    const { minutes = 60 } = req.query

    const dnsdistQps = await pool.query(`
      SELECT
        s.hostname,
        ds.queries_delta as qps,
        ds.ts
      FROM dnsdist_stats ds
      JOIN servers s ON s.id = ds.server_id
      WHERE ds.ts > NOW() - $1::interval
      ORDER BY ds.ts ASC
    `, [`${parseInt(minutes)} minutes`])

    const resolverQps = await pool.query(`
      SELECT
        s.hostname,
        rs.queries_delta as qps,
        rs.ts
      FROM resolver_stats rs
      JOIN servers s ON s.id = rs.server_id
      WHERE rs.ts > NOW() - $1::interval
      ORDER BY rs.ts ASC
    `, [`${parseInt(minutes)} minutes`])

    res.json({
      dnsdist: dnsdistQps.rows,
      resolvers: resolverQps.rows
    })
  } catch (err) {
    console.error('QPS history error:', err)
    res.status(500).json({ error: 'Failed to get QPS history' })
  }
})

module.exports = router
