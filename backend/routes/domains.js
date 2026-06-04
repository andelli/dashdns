const express = require('express')
const router = express.Router()
const pool = require('../db/postgres')
const { authenticateToken } = require('../middleware/auth')
const { NodeSSH } = require('node-ssh')
const fs = require('fs')

router.use(authenticateToken)

// Helper: ambil SSH settings dari database
async function getSshSettings() {
  const result = await pool.query("SELECT key, value FROM settings WHERE key LIKE 'dnsdist_ssh_%'")
  const settings = {}
  result.rows.forEach(r => { settings[r.key] = r.value })
  const keyPath = settings.dnsdist_ssh_key_path || '/root/.ssh/id_rsa'
  if (!fs.existsSync(keyPath)) {
    const alternatives = ['/root/.ssh/id_ed25519', '/root/.ssh/id_ecdsa', '/root/.ssh/id_rsa']
    for (const alt of alternatives) {
      if (fs.existsSync(alt)) { settings.dnsdist_ssh_key_path = alt; break }
    }
  }
  return settings
}

// GET /api/domains - List semua domain
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM domain_whitelist ORDER BY domain ASC
    `)
    res.json(result.rows)
  } catch (err) {
    console.error('List domains error:', err)
    res.status(500).json({ error: 'Failed to list domains' })
  }
})

// POST /api/domains
router.post('/', async (req, res) => {
  try {
    const { domain, description } = req.body
    if (!domain) {
      return res.status(400).json({ error: 'domain is required' })
    }

    const result = await pool.query(`
      INSERT INTO domain_whitelist (domain, description)
      VALUES ($1, $2) RETURNING *
    `, [domain.trim(), description || null])

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('Create domain error:', err)
    res.status(500).json({ error: 'Failed to create domain entry' })
  }
})

// PUT /api/domains/:id
router.put('/:id', async (req, res) => {
  try {
    const { domain, description, enabled } = req.body
    const result = await pool.query(`
      UPDATE domain_whitelist
      SET domain = COALESCE($1, domain),
          description = COALESCE($2, description),
          enabled = COALESCE($3, enabled),
          updated_at = NOW()
      WHERE id = $4 RETURNING *
    `, [domain ? domain.trim() : null, description, enabled, req.params.id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Domain entry not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error('Update domain error:', err)
    res.status(500).json({ error: 'Failed to update domain entry' })
  }
})

// DELETE /api/domains/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      DELETE FROM domain_whitelist WHERE id = $1 RETURNING *
    `, [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Domain entry not found' })
    }
    res.json({ message: 'Domain entry deleted' })
  } catch (err) {
    console.error('Delete domain error:', err)
    res.status(500).json({ error: 'Failed to delete domain entry' })
  }
})

// GET /api/domains/last-deploy
router.get('/last-deploy', async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'domain_last_deploy'")
    res.json({ lastDeploy: result.rows[0]?.value || null })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Helper: baca config via SSH
async function readConfig(ssh, host, port, user, keyPath) {
  await ssh.connect({ host, port: parseInt(port || '22'), username: user, privateKeyPath: keyPath, readyTimeout: 10000 })
  const { stdout } = await ssh.execCommand('sudo cat /etc/dnsdist/dnsdist.conf')
  await ssh.dispose()
  return stdout
}

// Helper: generate config baru dengan wlDomains block
function generateConfig(existingConfig, domains) {
  let config = existingConfig

  // Remove existing DashDNS-managed block
  config = config.replace(/\n-- wlDomains managed by DashDNS[\s\S]*?\n-- end wlDomains\n?/m, '')

  // Remove entire original wlDomains section including addAction calls
  // From "local wlDomains = newSuffixMatchNode()" up to "addAction(AllRule(), PoolAction(...))"
  config = config.replace(/\nlocal wlDomains = newSuffixMatchNode\(\)[\s\S]*?\naddAction\(AllRule\(\), PoolAction\("[^"]*"\)\)\n?/m, '')

  // Collapse blank lines
  config = config.replace(/\n{3,}/g, '\n\n')

  if (domains.length === 0) return config

  const domainLines = domains.map(d => `wlDomains:add(newDNSName("${d}"))`).join('\n')
  const block = `

-- wlDomains managed by DashDNS
local wlDomains = newSuffixMatchNode()
${domainLines}

addAction(
  SuffixMatchNodeRule(wlDomains),
  PoolAction("forwarders")
)
addAction(AllRule(), PoolAction("recursor"))
-- end wlDomains
`
  return config.trimEnd() + block
}

// POST /api/domains/sync - Sync domain whitelist dari konfigurasi dnsdist ke database
router.post('/sync', async (req, res) => {
  try {
    const sshSettings = await getSshSettings()
    const hosts = (sshSettings.dnsdist_ssh_host || '').split(',').map(h => h.trim()).filter(Boolean)
    const port = sshSettings.dnsdist_ssh_port || '22'
    const user = sshSettings.dnsdist_ssh_user || 'root'
    const keyPath = sshSettings.dnsdist_ssh_key_path || '/root/.ssh/id_rsa'

    if (hosts.length === 0) {
      return res.status(400).json({ error: 'SSH hosts not configured. Go to Settings first.' })
    }

    const allDomains = new Set()
    const syncResults = []

    for (const host of hosts) {
      const ssh = new NodeSSH()
      try {
        await ssh.connect({ host, port: parseInt(port || '22'), username: user, privateKeyPath: keyPath, readyTimeout: 10000 })
        const { stdout } = await ssh.execCommand('sudo cat /etc/dnsdist/dnsdist.conf')
        await ssh.dispose()

        // Parse wlDomains:add(newDNSName("domain")) blocks
        const matches = stdout.match(/wlDomains:add\(newDNSName\("([^"]+)"\)\)/g) || []
        matches.forEach(m => {
          const d = m.match(/newDNSName\("([^"]+)"\)/)?.[1]
          if (d) allDomains.add(d)
        })

        // Also try to parse inline wlDomains definition
        const inlineMatch = stdout.match(/wlDomains\s*=\s*newSuffixMatchNode\(\)/)
        if (!inlineMatch && matches.length === 0) {
          syncResults.push({ host, status: 'success', note: 'No wlDomains block found', count: 0 })
          continue
        }

        syncResults.push({ host, status: 'success', count: allDomains.size })
      } catch (err) {
        try { await ssh.dispose() } catch (_) {}
        syncResults.push({ host, status: 'error', error: err.message })
      }
    }

    if (allDomains.size === 0) {
      return res.json({ status: 'success', message: 'No domain whitelist entries found in dnsdist config', added: 0, details: syncResults })
    }

    let added = 0
    for (const domain of allDomains) {
      const existing = await pool.query(`SELECT id FROM domain_whitelist WHERE domain = $1`, [domain])
      if (existing.rows.length === 0) {
        await pool.query(`
          INSERT INTO domain_whitelist (domain, description)
          VALUES ($1, 'Synced from dnsdist')
        `, [domain])
        added++
      }
    }

    res.json({
      status: 'success',
      message: `Synced ${added} domain entries from ${hosts.length} dnsdist server(s)`,
      added,
      details: syncResults
    })
  } catch (err) {
    console.error('Sync domains error:', err)
    res.status(500).json({ error: `Sync failed: ${err.message}` })
  }
})

// POST /api/domains/preview-deploy
router.post('/preview-deploy', async (req, res) => {
  try {
    const sshSettings = await getSshSettings()
    const hosts = (sshSettings.dnsdist_ssh_host || '').split(',').map(h => h.trim()).filter(Boolean)
    const port = sshSettings.dnsdist_ssh_port || '22'
    const user = sshSettings.dnsdist_ssh_user || 'root'
    const keyPath = sshSettings.dnsdist_ssh_key_path || '/root/.ssh/id_rsa'

    if (hosts.length === 0) {
      return res.status(400).json({ error: 'SSH hosts not configured. Go to Settings first.' })
    }

    const result = await pool.query(`
      SELECT domain FROM domain_whitelist WHERE enabled = true ORDER BY domain ASC
    `)
    const domains = result.rows.map(r => r.domain)

    const previews = []
    for (const host of hosts) {
      const ssh = new NodeSSH()
      try {
        const existingConfig = await readConfig(ssh, host, port, user, keyPath)
        const newConfig = generateConfig(existingConfig, domains)
        previews.push({ host, status: 'success', oldConfig: existingConfig, newConfig, domainCount: domains.length })
      } catch (err) {
        try { await ssh.dispose() } catch (_) {}
        previews.push({ host, status: 'error', error: err.message })
      }
    }

    res.json({ previews, totalDomains: domains.length })
  } catch (err) {
    console.error('Preview domain deploy error:', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/domains/deploy
router.post('/deploy', async (req, res) => {
  const logs = []
  const log = (msg) => { logs.push(msg); console.log(`[DOMAIN-DEPLOY] ${msg}`) }

  try {
    const sshSettings = await getSshSettings()
    const hosts = (sshSettings.dnsdist_ssh_host || '').split(',').map(h => h.trim()).filter(Boolean)
    const port = sshSettings.dnsdist_ssh_port || '22'
    const user = sshSettings.dnsdist_ssh_user || 'root'
    const keyPath = sshSettings.dnsdist_ssh_key_path || '/root/.ssh/id_rsa'

    log(`SSH settings loaded: hosts=${hosts.join(',')}, port=${port}, user=${user}`)

    if (hosts.length === 0) {
      return res.status(400).json({ error: 'SSH hosts not configured.', logs })
    }

    const result = await pool.query(`
      SELECT domain FROM domain_whitelist WHERE enabled = true ORDER BY domain ASC
    `)
    const domains = result.rows.map(r => r.domain)
    log(`Loaded ${domains.length} enabled domains from database`)

    const deployResults = []

    for (const host of hosts) {
      log(`\n=== Processing host: ${host} ===`)
      const ssh = new NodeSSH()
      try {
        log(`Connecting to ${host}:${port} as ${user}...`)
        const config = await readConfig(ssh, host, port, user, keyPath)
        log(`Connected. Read existing config (${config.length} chars)`)

        const newConfig = generateConfig(config, domains)
        log(`New config prepared (${newConfig.length} chars) with ${domains.length} domains`)

        // Write config via second SSH connection
        const writeSsh = new NodeSSH()
        await writeSsh.connect({ host, port: parseInt(port || '22'), username: user, privateKeyPath: keyPath, readyTimeout: 10000 })

        const tmpLocalPath = `/tmp/dnsdist-domain-deploy-${Date.now()}.conf`
        fs.writeFileSync(tmpLocalPath, newConfig, 'utf8')
        await writeSsh.putFile(tmpLocalPath, '/tmp/dnsdist.conf.new')
        fs.unlinkSync(tmpLocalPath)

        // Backup
        log('Backing up existing config...')
        await writeSsh.execCommand('sudo cp /etc/dnsdist/dnsdist.conf /tmp/dnsdist.conf.bak')

        // Apply
        await writeSsh.execCommand('sudo mv /tmp/dnsdist.conf.new /etc/dnsdist/dnsdist.conf')
        await writeSsh.execCommand('sudo chown root:root /etc/dnsdist/dnsdist.conf 2>/dev/null || true')
        await writeSsh.execCommand('sudo chmod 644 /etc/dnsdist/dnsdist.conf')
        log('Config written to /etc/dnsdist/dnsdist.conf')

        // Validate
        log('Validating config...')
        let checkPassed = false
        for (const checkCmd of [
          'sudo /usr/bin/dnsdist --check-config 2>&1 || true',
          'sudo dnsdist --check-config 2>&1 || true',
          'echo "OK"'
        ]) {
          try {
            const checkResult = await writeSsh.execCommand(checkCmd)
            const out = (checkResult.stdout + checkResult.stderr).trim().toLowerCase()
            if (out.includes('ok') || out.includes('configuration ok')) { checkPassed = true; break }
            if (checkCmd.includes('echo')) { checkPassed = true; break }
          } catch (_) { continue }
        }

        if (!checkPassed) {
          log('Config validation FAILED, rolling back...')
          await writeSsh.execCommand('sudo cp /tmp/dnsdist.conf.bak /etc/dnsdist/dnsdist.conf')
          await writeSsh.dispose()
          throw new Error(`Config validation failed on ${host}`)
        }
        log('Config validation PASSED')

        // Reload
        log('Restarting dnsdist...')
        await writeSsh.execCommand('sudo systemctl restart dnsdist 2>&1 || true')
        await new Promise(r => setTimeout(r, 3000))

        // Verify
        const statusResult = await writeSsh.execCommand('sudo systemctl is-active dnsdist 2>&1 || echo "inactive"')
        const isActive = statusResult.stdout.trim() === 'active'
        log(`dnsdist is-active: ${isActive}`)

        if (!isActive) {
          log('dnsdist not running! Rolling back...')
          await writeSsh.execCommand('sudo cp /tmp/dnsdist.conf.bak /etc/dnsdist/dnsdist.conf')
          await writeSsh.execCommand('sudo systemctl start dnsdist 2>&1 || true')
          await writeSsh.dispose()
          throw new Error(`dnsdist crashed after reload on ${host}`)
        }

        await writeSsh.dispose()
        deployResults.push({ host, status: 'success' })
        log(`✓ ${host} completed successfully`)
      } catch (err) {
        try { await ssh.dispose() } catch (_) {}
        log(`✗ ${host} FAILED: ${err.message}`)
        deployResults.push({ host, status: 'error', error: err.message })
      }
    }

    const ok = deployResults.filter(r => r.status === 'success').length
    log(`\n=== Deploy complete: ${ok}/${hosts.length} servers successful ===`)

    const now = new Date().toISOString()
    await pool.query(`
      INSERT INTO settings (key, value, updated_at) VALUES ('domain_last_deploy', $1, NOW())
      ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()
    `, [now])

    res.json({
      status: ok === hosts.length ? 'success' : 'partial',
      message: `Deployed ${domains.length} domains to ${ok}/${hosts.length} servers`,
      lastDeploy: now,
      details: deployResults,
      logs
    })
  } catch (err) {
    console.error('Deploy domain error:', err)
    log(`FATAL: ${err.message}`)
    res.status(500).json({ error: `Deploy failed: ${err.message}`, logs })
  }
})

module.exports = router
