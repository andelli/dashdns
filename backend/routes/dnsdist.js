const express = require('express')
const router = express.Router()
const pool = require('../db/postgres')
const { authenticateToken } = require('../middleware/auth')

router.use(authenticateToken)

// GET /api/dnsdist - List all dnsdist servers with latest stats
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.id, s.hostname, s.ip, s.api_port, s.enabled,
        ds.queries_delta as qps,
        ds.queries,
        ds.cache_hits, ds.cache_misses, ds.cache_hit_ratio,
        ds.nxdomain, ds.nxdomain_delta,
        ds.servfail, ds.servfail_delta,
        ds.downstreams_timeout, ds.downstreams_timeout_delta,
        ds.acl_drops, ds.acl_drops_delta,
        ds.latency_avg, ds.latency_tcp, ds.latency_udp,
        ds.real_memory_usage as memory,
        ds.cpu_user, ds.cpu_system,
        ds.frontend_nhqueries,
        ds.rule_drop, ds.rule_nxdomain,
        ds.ts
      FROM servers s
      LEFT JOIN LATERAL (
        SELECT * FROM dnsdist_stats
        WHERE server_id = s.id
        ORDER BY id DESC LIMIT 1
      ) ds ON true
      WHERE s.type = 'dnsdist'
      ORDER BY s.hostname
    `)
    res.json(result.rows)
  } catch (err) {
    console.error('List dnsdist error:', err)
    res.status(500).json({ error: 'Failed to list dnsdist servers' })
  }
})

// GET /api/dnsdist/:id - Single dnsdist server detail
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.id, s.hostname, s.ip, s.api_port, s.enabled,
        ds.queries_delta as qps,
        ds.queries,
        ds.cache_hits, ds.cache_misses, ds.cache_hit_ratio,
        ds.nxdomain, ds.nxdomain_delta,
        ds.servfail, ds.servfail_delta,
        ds.downstreams_timeout, ds.downstreams_timeout_delta,
        ds.acl_drops, ds.acl_drops_delta,
        ds.latency_avg, ds.latency_tcp, ds.latency_udp,
        ds.real_memory_usage as memory,
        ds.cpu_user, ds.cpu_system,
        ds.frontend_nhqueries,
        ds.rule_drop, ds.rule_nxdomain,
        ds.ts
      FROM servers s
      LEFT JOIN LATERAL (
        SELECT * FROM dnsdist_stats
        WHERE server_id = s.id
        ORDER BY id DESC LIMIT 1
      ) ds ON true
      WHERE s.id = $1 AND s.type = 'dnsdist'
    `, [req.params.id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Server not found' })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error('Get dnsdist error:', err)
    res.status(500).json({ error: 'Failed to get dnsdist server' })
  }
})

// GET /api/dnsdist/:id/history - Time series data
router.get('/:id/history', async (req, res) => {
  try {
    const { minutes = 60 } = req.query
    const result = await pool.query(`
      SELECT
        ts, queries, queries_delta as qps,
        cache_hit_ratio, cache_hits, cache_misses,
        nxdomain, servfail,
        latency_avg, latency_tcp, latency_udp,
        real_memory_usage as memory,
        cpu_user, cpu_system,
        downstreams_timeout, acl_drops
      FROM dnsdist_stats
      WHERE server_id = $1
        AND ts > NOW() - interval '${parseInt(minutes)} minutes'
      ORDER BY ts ASC
    `, [req.params.id])
    res.json(result.rows)
  } catch (err) {
    console.error('Dnsdist history error:', err)
    res.status(500).json({ error: 'Failed to get history' })
  }
})

module.exports = router
