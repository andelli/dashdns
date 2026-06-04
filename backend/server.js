require('dotenv').config()

require('./db/postgres')

const express = require('express')
const cors = require('cors')
const path = require('path')

const { collectDnsdist } = require('./jobs/dnsdistJob')
const { collectResolver } = require('./jobs/resolverJob')

const app = express()

app.use(cors())
app.use(express.json())

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend/dist')))

// API Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/dashboard', require('./routes/dashboard'))
app.use('/api/dnsdist', require('./routes/dnsdist'))
app.use('/api/resolvers', require('./routes/resolvers'))
app.use('/api/servers', require('./routes/servers'))
app.use('/api/lookup', require('./routes/lookup'))
app.use('/api/acl', require('./routes/acl'))
app.use('/api/domains', require('./routes/domains'))
app.use('/api/settings', require('./routes/settings'))
app.use('/api/top', require('./routes/top'))
app.use('/api/health', require('./routes/health'))

// SPA fallback - serve index.html for non-API routes
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'))
})

const PORT = process.env.PORT || 3000

app.listen(PORT, '0.0.0.0', () => {
  console.log(`DashDNS API running on 0.0.0.0:${PORT}`)
})

// Run collectors every 10 seconds with no overlap
let collecting = false
setTimeout(() => {
  setInterval(async () => {
    if (collecting) return
    collecting = true
    console.log('[Collector] Running...')
    try {
      await Promise.all([
        collectDnsdist(),
        collectResolver()
      ])
    } catch (err) {
      console.error('[Collector] Error:', err.message)
    } finally {
      collecting = false
    }
  }, 10000)
}, 10000)
