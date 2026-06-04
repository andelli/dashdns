const express = require('express')
const router = express.Router()
const pool = require('../db/postgres')
const { authenticateToken } = require('../middleware/auth')
const axios = require('axios')

router.use(authenticateToken)

// GET /api/top/:resolverId - Fetch top queries and top remotes from recursor-exporter
router.get('/:resolverId', async (req, res) => {
  try {
    const server = await pool.query(`
      SELECT id, hostname, ip, api_port FROM servers
      WHERE id = $1 AND type = 'resolver' AND enabled = true
    `, [req.params.resolverId])

    if (server.rows.length === 0) {
      return res.status(404).json({ error: 'Resolver not found' })
    }

    const { ip } = server.rows[0]
    const port = 9000

    const response = await axios.get(`http://${ip}:${port}/stats`, { timeout: 5000 })

    const topQueries = (response.data.top_queries || []).map(q => {
      const totalEntries = response.data.top_queries_total_entries || 12500
      return {
        ...q,
        count: q.count || Math.round((q.percentage / 100) * totalEntries)
      }
    })

    const topRemotes = (response.data.top_remotes || []).map(r => {
      const totalEntries = response.data.top_remotes_total_entries || 12500
      return {
        ...r,
        count: r.count || Math.round((r.percentage / 100) * totalEntries)
      }
    })

    res.json({
      server: server.rows[0],
      top_queries: topQueries,
      top_remotes: topRemotes,
      top_queries_total_entries: response.data.top_queries_total_entries || 12500,
      top_remotes_total_entries: response.data.top_remotes_total_entries || 12500
    })
  } catch (err) {
    console.error('Top data error:', err)
    res.status(502).json({ error: 'Failed to fetch top data: ' + (err.response?.status === 404 ? 'exporter not found' : (err.code === 'ECONNREFUSED' ? 'exporter not running' : err.message)) })
  }
})

// GET /api/top - List all resolvers for top data
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, hostname, ip FROM servers
      WHERE type = 'resolver' AND enabled = true
      ORDER BY hostname
    `)
    res.json(result.rows)
  } catch (err) {
    console.error('List resolvers error:', err)
    res.status(500).json({ error: 'Failed to list resolvers' })
  }
})

module.exports = router
