const express = require('express')
const router = express.Router()
const dns = require('dns').promises
const { authenticateToken } = require('../middleware/auth')

router.use(authenticateToken)

function annotateAnswer(answer, queryType) {
  if (!answer || typeof answer !== 'object') {
    return { value: String(answer || '') }
  }

  // Use answer's own .type if available, otherwise use queryType as fallback
  const t = answer.type ? answer.type.toUpperCase() : (queryType || '').toUpperCase()

  const out = { recordType: t }

  if (t === 'A' || t === 'AAAA') {
    out.value = answer.address
    out.ttl = answer.ttl
    return out
  }
  if (t === 'MX') {
    out.value = `${answer.priority} ${answer.exchange}`
    out.priority = answer.priority
    out.exchange = answer.exchange
    out.ttl = answer.ttl
    return out
  }
  if (t === 'SOA') {
    out.value = `${answer.nsname} ${answer.hostmaster} ${answer.serial} ${answer.refresh} ${answer.retry} ${answer.expire} ${answer.minttl}`
    out.nsname = answer.nsname
    out.hostmaster = answer.hostmaster
    out.serial = answer.serial
    out.refresh = answer.refresh
    out.retry = answer.retry
    out.expire = answer.expire
    out.minttl = answer.minttl
    out.ttl = answer.ttl
    return out
  }
  if (t === 'SRV') {
    out.value = `${answer.priority} ${answer.weight} ${answer.port} ${answer.name}`
    out.priority = answer.priority
    out.weight = answer.weight
    out.port = answer.port
    out.name = answer.name
    out.ttl = answer.ttl
    return out
  }
  if (t === 'CAA') {
    out.value = `${answer.critical ? 'critical ' : ''}${answer.tag} "${answer.issue || answer.value}"`
    out.critical = answer.critical
    out.tag = answer.tag
    out.issue = answer.issue || answer.value
    out.ttl = answer.ttl
    return out
  }
  if (t === 'TXT') {
    // resolveTxt returns [['text1', 'text2']], resolve() with ttl returns similar
    // resolveAny returns { entries: ['text'], type: 'TXT' }
    const entries = Array.isArray(answer) ? answer : (answer.entries || [])
    out.value = Array.isArray(entries) ? entries.join(' ') : String(entries || '')
    out.ttl = answer.ttl
    return out
  }
  if (t === 'NS' || t === 'CNAME' || t === 'PTR') {
    out.value = answer.value
    out.ttl = answer.ttl
    return out
  }

  out.value = answer.value || answer.address || String(answer)
  out.ttl = answer.ttl
  return out
}

async function performLookup(resolver, domain, queryType) {
  const type = queryType.toUpperCase()

  // Use generic resolve() with ttl:true for all types that support it
  // resolveAny() always returns TTL
  if (type === 'ANY') return await resolver.resolveAny(domain)

  // For A, AAAA we pass ttl:true
  if (type === 'A') return await resolver.resolve4(domain, { ttl: true })
  if (type === 'AAAA') return await resolver.resolve6(domain, { ttl: true })

  // For others use generic resolve with ttl
  try {
    const result = await resolver.resolve(domain, type, { ttl: true })
    return result
  } catch {
    // Fallback to specific methods
    switch (type) {
      case 'MX': return await resolver.resolveMx(domain)
      case 'TXT': return await resolver.resolveTxt(domain)
      case 'NS': return await resolver.resolveNs(domain)
      case 'CNAME': return await resolver.resolveCname(domain)
      case 'SOA': return await resolver.resolveSoa(domain)
      case 'SRV': return await resolver.resolveSrv(domain)
      case 'PTR': return await resolver.resolvePtr(domain)
      case 'CAA': return await resolver.resolveCaa(domain)
      default: return await resolver.resolve4(domain, { ttl: true })
    }
  }
}

function detectType(ans) {
  if (!ans || typeof ans !== 'object') return null
  if ('address' in ans && ans.address.includes(':')) return 'AAAA'
  if ('address' in ans) return 'A'
  if ('exchange' in ans || 'priority' in ans) return 'MX'
  if ('nsname' in ans) return 'SOA'
  if ('name' in ans && 'port' in ans) return 'SRV'
  if ('tag' in ans) return 'CAA'
  if (Array.isArray(ans)) return 'TXT'
  if (typeof ans === 'string') return 'NS'
  if (ans.type) return ans.type
  return null
}

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
    let error = null
    let answers = []

    const resolver = new dns.Resolver()
    resolver.setServers([`${server}:53`])

    try {
      const raw = await performLookup(resolver, domain, queryType)
      const items = Array.isArray(raw) ? raw : [raw]
      answers = items.map(a => annotateAnswer(a, queryType))
    } catch (err) {
      error = err.code || err.message
    }

    const responseTime = Date.now() - startTime

    res.json({
      domain,
      type: queryType.toUpperCase(),
      server,
      responseTime,
      answers,
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
          const raw = await performLookup(resolver, domain, queryType)
          const items = Array.isArray(raw) ? raw : [raw]
          return {
            server,
            responseTime: Date.now() - startTime,
            answers: items.map(a => annotateAnswer(a, queryType)),
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
      type: queryType.toUpperCase(),
      results: results.map(r => r.value || { server: 'unknown', answers: [], error: 'lookup failed' }),
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('Multi DNS lookup error:', err)
    res.status(500).json({ error: 'Multi DNS lookup failed' })
  }
})

module.exports = router
