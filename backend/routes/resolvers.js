const express = require('express')
const router = express.Router()
const pool = require('../db/postgres')
const { authenticateToken } = require('../middleware/auth')

router.use(authenticateToken)

// GET /api/resolvers - List all resolver servers with latest stats
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.id, s.hostname, s.ip, s.api_port, s.enabled,
        rs.queries_delta as qps,
        rs.queries,
        rs.cache_hits, rs.cache_misses, rs.cache_hit_ratio,
        rs.cache_size, rs.cache_entries,
        rs.packet_cache_hits, rs.packet_cache_misses, rs.packet_cache_size,
        rs.nxdomain, rs.nxdomain_delta,
        rs.servfail, rs.servfail_delta,
        rs.timeouts, rs.timeouts_delta,
        rs.latency_avg,
        rs.memory_usage as memory,
        rs.cpu_user, rs.cpu_system,
        rs.concurrent_queries, rs.outgoing_timeouts,
        rs.dnssec_validations, rs.dnssec_bogus,
        COALESCE(rs.is_up, false) as is_up,
        rs.ts
      FROM servers s
      LEFT JOIN LATERAL (
        SELECT * FROM resolver_stats
        WHERE server_id = s.id
        ORDER BY id DESC LIMIT 1
      ) rs ON true
      WHERE s.type = 'resolver'
      ORDER BY s.hostname
    `)
    res.json(result.rows)
  } catch (err) {
    console.error('List resolvers error:', err)
    res.status(500).json({ error: 'Failed to list resolvers' })
  }
})

// GET /api/resolvers/:id - Single resolver server detail
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.id, s.hostname, s.ip, s.api_port, s.enabled,
        rs.queries_delta as qps,
        rs.queries,
        rs.cache_hits, rs.cache_misses, rs.cache_hit_ratio,
        rs.cache_size, rs.cache_entries,
        rs.packet_cache_hits, rs.packet_cache_misses, rs.packet_cache_size,
        rs.nxdomain, rs.nxdomain_delta,
        rs.servfail, rs.servfail_delta,
        rs.timeouts, rs.timeouts_delta,
        rs.latency_avg,
        rs.memory_usage as memory,
        rs.cpu_user, rs.cpu_system,
        rs.concurrent_queries, rs.outgoing_timeouts,
        rs.dnssec_validations, rs.dnssec_bogus,
        COALESCE(rs.is_up, false) as is_up,
        rs.ts
      FROM servers s
      LEFT JOIN LATERAL (
        SELECT * FROM resolver_stats
        WHERE server_id = s.id
        ORDER BY id DESC LIMIT 1
      ) rs ON true
      WHERE s.id = $1 AND s.type = 'resolver'
    `, [req.params.id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Server not found' })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error('Get resolver error:', err)
    res.status(500).json({ error: 'Failed to get resolver' })
  }
})

// GET /api/resolvers/:id/history - Time series data
router.get('/:id/history', async (req, res) => {
  try {
    const { minutes = 60 } = req.query
    const result = await pool.query(`
      SELECT
        ts, queries, queries_delta as qps,
        nxdomain, nxdomain_delta,
        servfail, servfail_delta,
        timeouts, timeouts_delta,
        cache_hit_ratio, cache_hits, cache_misses,
        packet_cache_hits, packet_cache_misses, packet_cache_size,
        latency_avg,
        memory_usage as memory,
        cpu_user, cpu_system,
        concurrent_queries,
        dnssec_validations, dnssec_bogus
      FROM resolver_stats
      WHERE server_id = $1
        AND ts > NOW() - $2::interval
      ORDER BY ts ASC
    `, [req.params.id])
    res.json(result.rows)
  } catch (err) {
    console.error('Resolver history error:', err)
    res.status(500).json({ error: 'Failed to get history' })
  }
})

module.exports = router
