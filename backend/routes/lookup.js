const express = require('express')
const router = express.Router()
const dns = require('dns').promises
const { authenticateToken } = require('../middleware/auth')

router.use(authenticateToken)

// POST /api/lookup - Perform DNS lookup through a specific server
router.post('/', async (req, res) => {
  try {
    const { domain, type, server } = req.body

    if (!domain) {
      return res.status(400).json({ error: 'domain is required' })
    }

    if (!server) {
      return res.status(400).json({ error: 'server (IP) is required' })
    }

    const queryType = type || 'A'
    const startTime = Date.now()
    const results = []
    let error = null

    // Configure dns to use the specified server
    const resolver = new dns.Resolver()
    resolver.setServers([`${server}:53`])

    try {
      let answer
      switch (queryType.toUpperCase()) {
        case 'A':
          answer = await resolver.resolve4(domain)
          break
        case 'AAAA':
          answer = await resolver.resolve6(domain)
          break
        case 'MX':
          answer = await resolver.resolveMx(domain)
          break
        case 'TXT':
          answer = await resolver.resolveTxt(domain)
          break
        case 'NS':
          answer = await resolver.resolveNs(domain)
          break
        case 'CNAME':
          answer = await resolver.resolveCname(domain)
          break
        case 'SOA':
          answer = await resolver.resolveSoa(domain)
          break
        case 'SRV':
          answer = await resolver.resolveSrv(domain)
          break
        case 'PTR':
          answer = await resolver.resolvePtr(domain)
          break
        case 'CAA':
          answer = await resolver.resolveCaa(domain)
          break
        case 'ANY':
          answer = await resolver.resolve(domain)
          break
        default:
          answer = await resolver.resolve4(domain)
      }
      results.push(...(Array.isArray(answer) ? answer : [answer]))
    } catch (err) {
      error = err.code || err.message
    }

    const responseTime = Date.now() - startTime

    res.json({
      domain,
      type: queryType,
      server,
      responseTime,
      answers: results,
      error,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('DNS lookup error:', err)
    res.status(500).json({ error: 'DNS lookup failed' })
  }
})

// POST /api/lookup/multi - Query multiple DNS servers for comparison
router.post('/multi', async (req, res) => {
  try {
    const { domain, type, servers } = req.body

    if (!domain || !servers || !Array.isArray(servers)) {
      return res.status(400).json({ error: 'domain and servers array required' })
    }

    const queryType = type || 'A'
    const results = await Promise.allSettled(
      servers.map(async (server) => {
        const startTime = Date.now()
        const resolver = new dns.Resolver()
        resolver.setServers([`${server}:53`])

        try {
          let answer
          switch (queryType.toUpperCase()) {
            case 'A':
              answer = await resolver.resolve4(domain)
              break
            case 'AAAA':
              answer = await resolver.resolve6(domain)
              break
            case 'MX':
              answer = await resolver.resolveMx(domain)
              break
            case 'TXT':
              answer = await resolver.resolveTxt(domain)
              break
            case 'NS':
              answer = await resolver.resolveNs(domain)
              break
            case 'CNAME':
              answer = await resolver.resolveCname(domain)
              break
            default:
              answer = await resolver.resolve4(domain)
          }
          return {
            server,
            responseTime: Date.now() - startTime,
            answers: Array.isArray(answer) ? answer : [answer],
            error: null
          }
        } catch (err) {
          return {
            server,
            responseTime: Date.now() - startTime,
            answers: [],
            error: err.code || err.message
          }
        }
      })
    )

    res.json({
      domain,
      type: queryType,
      results: results.map(r => r.value || { ...r.reason, answers: [], error: 'failed' }),
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('Multi DNS lookup error:', err)
    res.status(500).json({ error: 'Multi DNS lookup failed' })
  }
})

module.exports = router
