require('dotenv').config()

require('./db/postgres')

const express = require('express')
const cors = require('cors')
const cron = require('node-cron')
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
app.use('/api/settings', require('./routes/settings'))

// SPA fallback - serve index.html for non-API routes
app.get('/{*splat}', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' })
  }
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'))
})

const PORT = process.env.PORT || 3000

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`DashDNS API running on 0.0.0.0:${PORT}`)
  console.log('Running initial data collection...')

  await collectDnsdist()
  await collectResolver()

  console.log('Initial collection completed')
})

// Run collectors every 10 seconds
cron.schedule('*/10 * * * * *', async () => {
  console.log('[Collector] Running...')
  await collectDnsdist()
  await collectResolver()
})
