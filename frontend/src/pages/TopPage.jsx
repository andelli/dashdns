import { useEffect, useState } from 'react'
import * as api from '../services/api'
import './TopPage.css'

export default function TopPage() {
  const [resolvers, setResolvers] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('queries')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getTopResolvers().then(res => {
      setResolvers(res.data)
      if (res.data.length > 0) setSelectedId(res.data[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    setError(null)
    api.getResolverTopData(selectedId)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false))
  }, [selectedId])

  const selectedResolver = resolvers.find(r => r.id === selectedId)

  return (
    <div className="top-page">
      <div className="page-header">
        <h1>Insights</h1>
        <p className="subtitle">Top queries &amp; client remotes dari resolver</p>
      </div>

      {/* Server selector */}
      <div className="top-selector">
        {resolvers.map(r => (
          <button
            key={r.id}
            className={`top-server-btn ${selectedId === r.id ? 'active' : ''}`}
            onClick={() => setSelectedId(r.id)}
          >
            {r.hostname}
          </button>
        ))}
      </div>

      {/* Tab toggle */}
      {data && (
        <div className="top-tabs">
          <button className={`top-tab ${tab === 'queries' ? 'active' : ''}`} onClick={() => setTab('queries')}>
            Top Domains
          </button>
          <button className={`top-tab ${tab === 'remotes' ? 'active' : ''}`} onClick={() => setTab('remotes')}>
            Top Remotes
          </button>
        </div>
      )}

      {/* Content */}
      {loading && <div className="loading">Memuat data...</div>}
      {error && <div className="error">{error}</div>}

      {data && tab === 'queries' && (
        <div className="top-table-card">
          <div className="top-table-header">
            <span className="top-table-title">Top Domains — {selectedResolver?.hostname}</span>
            <span className="top-table-sub">{data.top_queries_total_entries?.toLocaleString()} total — {data.top_queries.length} entries shown</span>
          </div>
          <div className="top-table-wrap">
            <table className="top-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Persentase</th>
                  <th>Hits</th>
                  <th>Domain</th>
                  <th>Tipe</th>
                </tr>
              </thead>
              <tbody>
                {data.top_queries.map((q, i) => {
                  const parts = q.query?.split('|') || []
                  return (
                    <tr key={i}>
                      <td className="rank-cell">{i + 1}</td>
                      <td className="pct-cell">
                        <div className="pct-bar-wrap">
                          <div className="pct-bar" style={{ width: `${Math.min(q.percentage * 5, 100)}%` }} />
                          <span>{q.percentage.toFixed(2)}%</span>
                        </div>
                      </td>
                      <td className="count-cell">{q.count?.toLocaleString() || '—'}</td>
                      <td className="domain-cell">{parts[0] || q.query}</td>
                      <td className="type-cell">{parts[1] ? <span className="top-type">{parts[1]}</span> : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && tab === 'remotes' && (
        <div className="top-table-card">
          <div className="top-table-header">
            <span className="top-table-title">Top Remotes — {selectedResolver?.hostname}</span>
            <span className="top-table-sub">{data.top_remotes_total_entries?.toLocaleString()} total — {data.top_remotes.length} entries shown</span>
          </div>
          <div className="top-table-wrap">
            <table className="top-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Persentase</th>
                  <th>Hits</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {data.top_remotes.map((r, i) => (
                  <tr key={i}>
                    <td className="rank-cell">{i + 1}</td>
                    <td className="pct-cell">
                      <div className="pct-bar-wrap">
                        <div className="pct-bar" style={{ width: `${Math.min(r.percentage * 5, 100)}%` }} />
                        <span>{r.percentage.toFixed(2)}%</span>
                      </div>
                    </td>
                    <td className="count-cell">{r.count?.toLocaleString() || '—'}</td>
                    <td className="domain-cell mono">{r.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
