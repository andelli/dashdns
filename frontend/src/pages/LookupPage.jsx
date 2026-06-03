import { useEffect, useState } from 'react'
import * as api from '../services/api'
import './LookupPage.css'

export default function LookupPage() {
  const [domain, setDomain] = useState('')
  const [queryType, setQueryType] = useState('A')
  const [selectedServer, setSelectedServer] = useState('')
  const [servers, setServers] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [multiMode, setMultiMode] = useState(false)
  const [selectedServers, setSelectedServers] = useState([])

  const loadServers = async () => {
    try {
      const res = await api.getDnsdistServers()
      const dnsdistServers = res.data.filter(s => s.queries !== null)
      setServers(dnsdistServers)
      if (dnsdistServers.length > 0) {
        setSelectedServer(dnsdistServers[0].ip)
        setSelectedServers(dnsdistServers.map(s => s.ip))
      }
    } catch (err) {
      console.error('Load servers error:', err)
    }
  }

  useEffect(() => {
    loadServers()
  }, [])

  const handleLookup = async (e) => {
    e.preventDefault()
    if (!domain) return

    setLoading(true)
    setResult(null)

    try {
      let res
      if (multiMode && selectedServers.length > 0) {
        res = await api.dnsLookupMulti(domain, queryType, selectedServers)
      } else {
        res = await api.dnsLookup(domain, queryType, selectedServer)
      }
      setResult(res.data)
    } catch (err) {
      console.error('Lookup error:', err)
      setResult({ error: 'Lookup failed: ' + (err.response?.data?.error || err.message) })
    } finally {
      setLoading(false)
    }
  }

  const toggleServerSelection = (ip) => {
    setSelectedServers(prev =>
      prev.includes(ip)
        ? prev.filter(s => s !== ip)
        : [...prev, ip]
    )
  }

  const queryTypes = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'SRV', 'PTR', 'CAA', 'ANY']

  return (
    <div className="lookup-page">
      <div className="page-header">
        <h1>DNS Lookup Tool</h1>
        <p className="subtitle">Query DNS records through your dnsdist servers</p>
      </div>

      <div className="lookup-card">
        <form onSubmit={handleLookup} className="lookup-form">
          <div className="form-row-3">
            <div className="form-group">
              <label>Domain</label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g., example.com"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Query Type</label>
              <select value={queryType} onChange={(e) => setQueryType(e.target.value)}>
                {queryTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Mode</label>
              <select value={multiMode ? 'multi' : 'single'} onChange={(e) => setMultiMode(e.target.value === 'multi')}>
                <option value="single">Single Server</option>
                <option value="multi">Compare Servers</option>
              </select>
            </div>
          </div>

          {!multiMode ? (
            <div className="form-group">
              <label>DNS Server</label>
              <select value={selectedServer} onChange={(e) => setSelectedServer(e.target.value)}>
                {servers.map(s => (
                  <option key={s.id} value={s.ip}>{s.hostname} ({s.ip})</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label>Select Servers to Compare</label>
              <div className="server-checkboxes">
                {servers.map(s => (
                  <label key={s.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedServers.includes(s.ip)}
                      onChange={() => toggleServerSelection(s.ip)}
                    />
                    {s.hostname} ({s.ip})
                  </label>
                ))}
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Looking up...' : '🔍 Lookup'}
          </button>
        </form>
      </div>

      {result && (
        <div className="result-card">
          <h3>Results</h3>

          {result.error && (
            <div className="error-message">{result.error}</div>
          )}

          {result.results ? (
            <div className="comparison-grid">
              {result.results.map((r, i) => (
                <div key={i} className={`comparison-item ${r.error ? 'has-error' : ''}`}>
                  <div className="comparison-header">
                    <span className="server-name">{r.server}</span>
                    <span className={`response-time ${r.responseTime < 50 ? 'fast' : r.responseTime < 200 ? 'medium' : 'slow'}`}>
                      {r.responseTime}ms
                    </span>
                  </div>
                  {r.error ? (
                    <div className="error-text">{r.error}</div>
                  ) : (
                    <div className="answers">
                      {r.answers.map((ans, j) => (
                        <div key={j} className="answer-item">
                          {typeof ans === 'object' ? JSON.stringify(ans) : ans}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : result.answers ? (
            <div className="single-result">
              <div className="result-meta">
                <span>Server: <strong>{result.server}</strong></span>
                <span>Query: <strong>{result.domain} {result.type}</strong></span>
                <span className={`response-time ${result.responseTime < 50 ? 'fast' : result.responseTime < 200 ? 'medium' : 'slow'}`}>
                  Response: {result.responseTime}ms
                </span>
              </div>
              <div className="answers-list">
                {result.answers.length === 0 ? (
                  <div className="no-records">No records found</div>
                ) : (
                  result.answers.map((ans, i) => (
                    <div key={i} className="answer-item">
                      {typeof ans === 'object' ? JSON.stringify(ans, null, 2) : ans}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
