const express = require('express')
const router = express.Router()
const pool = require('../db/postgres')
const { authenticateToken } = require('../middleware/auth')

router.use(authenticateToken)

// GET /api/servers - List all servers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, hostname, ip, api_port, type, enabled, created_at,
        CASE 
          WHEN type = 'dnsdist' THEN (
            SELECT ts FROM dnsdist_stats WHERE server_id = servers.id ORDER BY ts DESC LIMIT 1
          )
          ELSE (
            SELECT ts FROM resolver_stats WHERE server_id = servers.id ORDER BY ts DESC LIMIT 1
          )
        END as last_seen
      FROM servers 
      ORDER BY type, hostname
    `)
    res.json(result.rows)
  } catch (err) {
    console.error('List servers error:', err)
    res.status(500).json({ error: 'Failed to list servers' })
  }
})

// GET /api/servers/:id - Get single server
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, hostname, ip, api_port, type, api_key, enabled, created_at FROM servers WHERE id = $1',
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Server not found' })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error('Get server error:', err)
    res.status(500).json({ error: 'Failed to get server' })
  }
})

// POST /api/servers - Create new server
router.post('/', async (req, res) => {
  try {
    const { hostname, ip, api_port, type, api_key, enabled } = req.body

    if (!hostname || !ip || !api_port || !type) {
      return res.status(400).json({ error: 'hostname, ip, api_port, and type are required' })
    }

    if (!['dnsdist', 'resolver'].includes(type)) {
      return res.status(400).json({ error: 'type must be "dnsdist" or "resolver"' })
    }

    const result = await pool.query(`
      INSERT INTO servers (hostname, ip, api_port, type, api_key, enabled)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, hostname, ip, api_port, type, enabled, created_at
    `, [hostname, ip, api_port, type, api_key || null, enabled !== false])

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('Create server error:', err)
    res.status(500).json({ error: 'Failed to create server' })
  }
})

// PUT /api/servers/:id - Update server
router.put('/:id', async (req, res) => {
  try {
    const { hostname, ip, api_port, type, api_key, enabled } = req.body

    if (!hostname || !ip || !api_port || !type) {
      return res.status(400).json({ error: 'hostname, ip, api_port, and type are required' })
    }

    if (!['dnsdist', 'resolver'].includes(type)) {
      return res.status(400).json({ error: 'type must be "dnsdist" or "resolver"' })
    }

    const result = await pool.query(`
      UPDATE servers 
      SET hostname = $1, ip = $2, api_port = $3, type = $4, api_key = $5, enabled = $6
      WHERE id = $7
      RETURNING id, hostname, ip, api_port, type, enabled, created_at
    `, [hostname, ip, api_port, type, api_key || null, enabled !== false, req.params.id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Server not found' })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error('Update server error:', err)
    res.status(500).json({ error: 'Failed to update server' })
  }
})

// DELETE /api/servers/:id - Delete server
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM servers WHERE id = $1 RETURNING id, hostname',
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Server not found' })
    }

    res.json({ message: `Server ${result.rows[0].hostname} deleted successfully` })
  } catch (err) {
    console.error('Delete server error:', err)
    res.status(500).json({ error: 'Failed to delete server' })
  }
})

// PATCH /api/servers/:id/toggle - Toggle server enabled status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE servers 
      SET enabled = NOT enabled
      WHERE id = $1
      RETURNING id, hostname, enabled
    `, [req.params.id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Server not found' })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error('Toggle server error:', err)
    res.status(500).json({ error: 'Failed to toggle server' })
  }
})

module.exports = router
