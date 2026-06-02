const express = require('express')
const router = express.Router()
const pool = require('../db/postgres')
const { authenticateToken } = require('../middleware/auth')
const { NodeSSH } = require('node-ssh')

router.use(authenticateToken)

// GET /api/settings - Ambil semua settings
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings ORDER BY key')
    const settings = {}
    result.rows.forEach(row => {
      settings[row.key] = row.value
    })
    res.json(settings)
  } catch (err) {
    console.error('Get settings error:', err)
    res.status(500).json({ error: 'Failed to get settings' })
  }
})

// PUT /api/settings - Update settings
router.put('/', async (req, res) => {
  try {
    const allowed = ['dnsdist_ssh_host', 'dnsdist_ssh_port', 'dnsdist_ssh_user', 'dnsdist_ssh_key_path']

    for (const [key, value] of Object.entries(req.body)) {
      if (!allowed.includes(key)) continue
      await pool.query(`
        INSERT INTO settings (key, value, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
      `, [key, String(value)])
    }

    // Return updated settings
    const result = await pool.query('SELECT * FROM settings ORDER BY key')
    const settings = {}
    result.rows.forEach(row => {
      settings[row.key] = row.value
    })
    res.json(settings)
  } catch (err) {
    console.error('Update settings error:', err)
    res.status(500).json({ error: 'Failed to update settings' })
  }
})

// POST /api/settings/test-ssh - Test SSH connection ke dnsdist
router.post('/test-ssh', async (req, res) => {
  try {
    const { dnsdist_ssh_host, dnsdist_ssh_port, dnsdist_ssh_user, dnsdist_ssh_key_path } = req.body

    if (!dnsdist_ssh_host) {
      return res.status(400).json({ error: 'SSH host is required' })
    }

    const hosts = dnsdist_ssh_host.split(',').map(h => h.trim()).filter(Boolean)
    const port = dnsdist_ssh_port || '22'
    const user = dnsdist_ssh_user || 'root'
    let keyPath = dnsdist_ssh_key_path || '/root/.ssh/id_rsa'

    // Auto-detect SSH key
    const fs = require('fs')
    if (!fs.existsSync(keyPath)) {
      const alternatives = ['/root/.ssh/id_ed25519', '/root/.ssh/id_ecdsa', '/root/.ssh/id_rsa']
      for (const alt of alternatives) {
        if (fs.existsSync(alt)) { keyPath = alt; break }
      }
    }
    const results = []

    for (const host of hosts) {
      const ssh = new NodeSSH()
      try {
        await ssh.connect({
          host,
          port: parseInt(port),
          username: user,
          privateKeyPath: keyPath,
          readyTimeout: 10000
        })

        // Test sudo access + read config
        const { stdout } = await ssh.execCommand('sudo cat /etc/dnsdist/dnsdist.conf')
        const hasAcl = stdout.includes('setACL')

        await ssh.dispose()
        results.push({
          host,
          status: 'success',
          hasConfig: true,
          hasAcl
        })
      } catch (err) {
        let errorMsg = err.message
        if (err.message.includes('private key') || err.message.includes('ECONNREFUSED')) {
          errorMsg = err.message.includes('private key')
            ? 'SSH key not found or invalid. Generate key first: ssh-keygen -t rsa -b 4096'
            : 'Connection refused. Check SSH host/port and firewall'
        }
        results.push({
          host,
          status: 'error',
          error: errorMsg
        })
      }
    }

    res.json({ results })
  } catch (err) {
    console.error('Test SSH error:', err)
    res.status(500).json({ error: `Test failed: ${err.message}` })
  }
})

module.exports = router
