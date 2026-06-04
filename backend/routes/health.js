const express = require('express')
const router = express.Router()
const pool = require('../db/postgres')
const { authenticateToken } = require('../middleware/auth')
const { checkResolver, checkDnsdist } = require('../services/portCheck')

router.use(authenticateToken)

// GET /api/health - Check port health for all servers
router.get('/', async (req, res) => {
  try {
    const servers = await pool.query(`
      SELECT id, hostname, ip, type FROM servers WHERE enabled = true
    `)

    const checks = await Promise.allSettled(servers.rows.map(async (s) => {
      try {
        const ports = s.type === 'resolver'
          ? await checkResolver(s.ip)
          : await checkDnsdist(s.ip)
        return { id: s.id, hostname: s.hostname, ip: s.ip, type: s.type, ...ports }
      } catch (err) {
        return { id: s.id, hostname: s.hostname, ip: s.ip, type: s.type, dns: { up: false, ms: 0 }, api: { up: false, ms: 0 }, error: err.message }
      }
    }))
    res.json(checks.map(function(c) {
      return c.status === 'fulfilled' ? c.value : c.reason
    }))
  } catch (err) {
    console.error('Health check error:', err)
    res.status(500).json({ error: 'Health check failed' })
  }
})

module.exports = router
