import { useEffect, useState, useRef, useCallback } from 'react'
import * as api from '../services/api'
import DnsRecordCard from '../components/DnsRecordCard'
import './LookupPage.css'

const QUERY_TYPES = [
  { value: 'A', label: 'A', desc: 'IPv4' },
  { value: 'AAAA', label: 'AAAA', desc: 'IPv6' },
  { value: 'MX', label: 'MX', desc: 'Mail Exchange' },
  { value: 'NS', label: 'NS', desc: 'Nameserver' },
  { value: 'CNAME', label: 'CNAME', desc: 'Canonical Name' },
  { value: 'TXT', label: 'TXT', desc: 'Teks' },
  { value: 'SOA', label: 'SOA', desc: 'Start of Authority' },
  { value: 'SRV', label: 'SRV', desc: 'Service' },
  { value: 'PTR', label: 'PTR', desc: 'Pointer' },
  { value: 'CAA', label: 'CAA', desc: 'Cert Authority' },
  { value: 'ANY', label: 'ANY', desc: 'Semua Record' },
]

const PUBLIC_DNS = [
  { name: 'Google', ip: '8.8.8.8' },
  { name: 'Cloudflare', ip: '1.1.1.1' },
  { name: 'OpenDNS', ip: '208.67.222.222' },
  { name: 'Quad9', ip: '9.9.9.9' },
]

function formatMs(ms) {
  if (ms == null || ms < 1) return '<1ms'
  return `${Math.round(ms)}ms`
}

export default function LookupPage() {
  const [domain, setDomain] = useState('')
  const [queryType, setQueryType] = useState('A')
  const [servers, setServers] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [resolverServers, setResolverServers] = useState([])
  const [selectedResolvers, setSelectedResolvers] = useState([])
  const [selectedLocal, setSelectedLocal] = useState([])
  const [selectedPublic, setSelectedPublic] = useState([])
  const resultRef = useRef(null)

  const loadServers = useCallback(async () => {
    try {
      const [dnsdistRes, resolverRes] = await Promise.all([
        api.getDnsdistServers(),
        api.getResolverServers(),
      ])
      const dnsdistServers = dnsdistRes.data.filter(s => s.queries !== null)
      setServers(dnsdistServers)
      if (dnsdistServers.length > 0) {
        setSelectedLocal(dnsdistServers.map(s => s.ip))
      }

      const rSl = resolverRes.data.filter(s => s.is_up)
      setResolverServers(rSl)
    } catch (err) {
      console.error('Load servers error:', err)
    }
  }, [])

  useEffect(() => { loadServers() }, [loadServers])

  const handleLookup = async (e) => {
    e.preventDefault()
    if (!domain) return
    setLoading(true)
    setResult(null)

    try {
      const ips = [...selectedLocal, ...selectedResolvers, ...selectedPublic]
      let res
      if (ips.length > 1) {
        res = await api.dnsLookupMulti(domain, queryType, ips)
      } else if (ips.length === 1) {
        res = await api.dnsLookup(domain, queryType, ips[0])
      } else {
        res = await api.dnsLookup(domain, queryType, servers[0]?.ip)
      }
      setResult(res.data)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (err) {
      setResult({ error: 'Lookup gagal: ' + (err.response?.data?.error || err.message) })
    } finally {
      setLoading(false)
    }
  }

  const toggleLocal = (ip) => {
    setSelectedLocal(prev =>
      prev.includes(ip) ? prev.filter(s => s !== ip) : [...prev, ip]
    )
  }

  const togglePublic = (ip) => {
    setSelectedPublic(prev =>
      prev.includes(ip) ? prev.filter(s => s !== ip) : [...prev, ip]
    )
  }

  const toggleResolver = (ip) => {
    setSelectedResolvers(prev =>
      prev.includes(ip) ? prev.filter(s => s !== ip) : [...prev, ip]
    )
  }

  const typeMeta = QUERY_TYPES.find(t => t.value === queryType)
  const totalSelected = selectedLocal.length + selectedResolvers.length + selectedPublic.length

  const getServerName = (ip) => {
    const s = servers.find(s => s.ip === ip)
    const rs = resolverServers.find(s => s.ip === ip)
    const pub = PUBLIC_DNS.find(d => d.ip === ip)
    return pub ? pub.name : (s ? s.hostname : rs ? rs.hostname : ip)
  }

  return (
    <div className="lookup-page">
      <div className="page-header">
        <h1>DNS Lookup</h1>
        <p className="subtitle">Periksa dan bandingkan DNS record dari berbagai server</p>
      </div>

      {/* ── Form ── */}
      <div className="lk-card lk-form-card">
        <form onSubmit={handleLookup} className="lk-form">
          {/* Baris 1: Domain + Tipe */}
          <div className="lk-row lk-row-top">
            <div className="lk-field lk-field-domain">
              <label>Domain</label>
              <input
                type="text"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="example.com"
                required
                autoFocus
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            <div className="lk-field lk-field-actions">
              <label>&nbsp;</label>
              <button
                type="submit"
                className="btn btn-primary lk-go-btn"
                disabled={loading || !domain.trim()}
              >
                {loading ? <span className="lk-spinner" /> : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                )}
                {loading ? 'Mencari...' : 'Cari'}
              </button>
            </div>

            <div className="lk-field lk-field-type">
              <label>Tipe</label>
              <select value={queryType} onChange={e => setQueryType(e.target.value)}>
                {QUERY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {typeMeta && <span className="lk-type-hint">{typeMeta.desc}</span>}
            </div>
          </div>

          {/* Server sections */}
          <div className="lk-divider">
            <span>Server DNS</span>
            {totalSelected > 0 && <span className="lk-divider-count">{totalSelected} dipilih</span>}
          </div>

          <div className="lk-server-cols">
            {/* Local servers */}
            <div className="lk-server-col">
              <div className="lk-col-header">
                <span className="lk-col-title">Lokal</span>
                <div className="lk-col-actions">
                  <button type="button" className="lk-act" onClick={() => setSelectedLocal(servers.map(s => s.ip))}>Semua</button>
                  <button type="button" className="lk-act" onClick={() => setSelectedLocal([])}>Reset</button>
                </div>
              </div>

              <div className="lk-chips">
                {servers.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    className={`lk-chip ${selectedLocal.includes(s.ip) ? 'on' : ''}`}
                    onClick={() => toggleLocal(s.ip)}
                  >
                    <span className="lk-chip-name">{s.hostname}</span>
                    <span className="lk-chip-ip">{s.ip}</span>
                  </button>
                ))}
                {servers.length === 0 && <span className="lk-empty">Tidak ada server</span>}
              </div>
            </div>

            {/* Resolver servers */}
            <div className="lk-server-col lk-col-resolver">
              <div className="lk-col-header">
                <span className="lk-col-title">Resolver</span>
                <div className="lk-col-actions">
                  <button type="button" className="lk-act" onClick={() => setSelectedResolvers(resolverServers.map(s => s.ip))}>Semua</button>
                  <button type="button" className="lk-act" onClick={() => setSelectedResolvers([])}>Reset</button>
                </div>
              </div>

              <div className="lk-chips">
                {resolverServers.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    className={`lk-chip lk-chip-resolver ${selectedResolvers.includes(s.ip) ? 'on' : ''}`}
                    onClick={() => toggleResolver(s.ip)}
                  >
                    <span className="lk-chip-name">{s.hostname}</span>
                    <span className="lk-chip-ip">{s.ip}</span>
                  </button>
                ))}
                {resolverServers.length === 0 && <span className="lk-empty">Tidak ada resolver online</span>}
              </div>
            </div>

            {/* Public DNS */}
            <div className="lk-server-col lk-col-public">
              <div className="lk-col-header">
                <span className="lk-col-title">Publik</span>
                <div className="lk-col-actions">
                  <button type="button" className="lk-act" onClick={() => setSelectedPublic(PUBLIC_DNS.map(d => d.ip))}>Semua</button>
                  <button type="button" className="lk-act" onClick={() => setSelectedPublic([])}>Reset</button>
                </div>
              </div>

              <div className="lk-chips">
                {PUBLIC_DNS.map(d => (
                  <button
                    key={d.ip}
                    type="button"
                    className={`lk-chip lk-chip-public ${selectedPublic.includes(d.ip) ? 'on' : ''}`}
                    onClick={() => togglePublic(d.ip)}
                  >
                    <span className="lk-chip-name">{d.name}</span>
                    <span className="lk-chip-ip">{d.ip}</span>
                  </button>
                ))}
              </div>

              <div className="lk-col-note">
                Server publik akan diquery langsung via port 53 pada server tujuan.
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* ── Hasil ── */}
      {result && (
        <div className="lk-results" ref={resultRef}>

          {/* Error — single mode */}
          {result.error && result.answers?.length === 0 && !result.results && (
            <div className="lk-error-card">
              <div className="lk-error-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div>
                <div className="lk-error-title">Gagal</div>
                <div className="lk-error-body">{result.error}</div>
              </div>
            </div>
          )}

          {/* Single result */}
          {result.answers && result.answers.length > 0 && !result.results && (
            <>
              <div className="lk-meta-bar">
                <div className="lk-meta-item">
                  <span className="lk-meta-label">Domain</span>
                  <strong>{result.domain}</strong>
                </div>
                <div className="lk-meta-item">
                  <span className="lk-meta-label">Tipe</span>
                  <span className="lk-type-pill">{result.type}</span>
                </div>
                <div className="lk-meta-item">
                  <span className="lk-meta-label">Server</span>
                  <code>{getServerName(result.server)}</code>
                </div>
                <div className="lk-meta-item">
                  <span className="lk-meta-label">Respon</span>
                  <span className={`lk-ms-badge lk-ms-${result.responseTime < 50 ? 'fast' : result.responseTime < 200 ? 'med' : 'slow'}`}>
                    {formatMs(result.responseTime)}
                  </span>
                </div>
                <div className="lk-meta-item">
                  <span className="lk-meta-label">Record</span>
                  <span className="lk-count-badge">{result.answers.length}</span>
                </div>
              </div>

              <div className="lk-card">
                {result.answers.length === 0 ? (
                  <div className="lk-empty-note">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
                    </svg>
                    Tidak ada record ditemukan
                  </div>
                ) : (
                  <div className="lk-record-list">
                    {result.answers.map((ans, i) => (
                      <DnsRecordCard key={i} answer={ans} type={result.type} index={i} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Multi comparison */}
          {result.results && (
            <>
              <div className="lk-meta-bar">
                <div className="lk-meta-item">
                  <span className="lk-meta-label">Domain</span>
                  <strong>{result.domain}</strong>
                </div>
                <div className="lk-meta-item">
                  <span className="lk-meta-label">Tipe</span>
                  <span className="lk-type-pill">{result.type}</span>
                </div>
                <div className="lk-meta-item">
                  <span className="lk-meta-label">Server</span>
                  <span className="lk-count-badge">{result.results.length}</span>
                </div>
                <div className="lk-meta-item">
                  <span className="lk-meta-label">OK</span>
                  <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{result.results.filter(r => !r.error).length}</span>
                </div>
                <div className="lk-meta-item">
                  <span className="lk-meta-label">Gagal</span>
                  <span style={{ color: 'var(--color-error)', fontWeight: 600 }}>{result.results.filter(r => r.error).length}</span>
                </div>
              </div>

              <div className="lk-compare-grid">
                {result.results.map((r, i) => {
                  const pub = PUBLIC_DNS.find(d => d.ip === r.server)
                  return (
                    <div key={i} className={`lk-compare-card ${r.error ? 'err' : ''} ${pub ? 'public' : ''}`}>
                      <div className="lk-cc-header">
                        <div className="lk-cc-info">
                          <span className={`lk-cc-dot ${r.error ? 'red' : 'green'}`} />
                          <span className="lk-cc-name">{getServerName(r.server)}</span>
                          {pub && <span className="lk-cc-tag">Publik</span>}
                        </div>
                        <span className={`lk-ms-badge lk-ms-${r.responseTime < 50 ? 'fast' : r.responseTime < 200 ? 'med' : 'slow'}`}>
                          {formatMs(r.responseTime)}
                        </span>
                      </div>

                      <div className="lk-cc-body">
                        {r.error ? (
                          <div className="lk-cc-error">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                            </svg>
                            {r.error}
                          </div>
                        ) : (
                          <div className="lk-cc-answers">
                            {r.answers.slice(0, 4).map((ans, j) => (
                              <code key={j} className="lk-cc-val">{ans?.value || ans?.address || ans || '—'}</code>
                            ))}
                            {r.answers.length > 4 && (
                              <span className="lk-cc-more">+{r.answers.length - 4} lainnya</span>
                            )}
                            {r.answers.length === 0 && (
                              <span className="lk-cc-none">Tidak ada record</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="lk-cc-footer">
                        {r.answers.length} record{r.answers.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
