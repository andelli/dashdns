import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import * as api from '../services/api'
import StatsCard from '../components/StatsCard'
import QpsChart from '../components/QpsChart'
import CacheHitChart from '../components/CacheHitChart'
import './ServerDetail.css'

export default function ServerDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const type = location.pathname.startsWith('/dnsdist') ? 'dnsdist' : 'resolver'
  const navigate = useNavigate()
  const [server, setServer] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState(60)

  const isDnsdist = type === 'dnsdist'
  const apiGetServer = isDnsdist ? api.getDnsdistServer : api.getResolverServer
  const apiGetHistory = isDnsdist ? api.getDnsdistHistory : api.getResolverHistory

  const loadData = async () => {
    try {
      const [serverRes, historyRes] = await Promise.all([
        apiGetServer(id),
        apiGetHistory(id, timeRange)
      ])
      setServer(serverRes.data)
      setHistory(historyRes.data)
    } catch (err) {
      console.error('Load server detail error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [id, timeRange])

  if (loading || !server) {
    return <div className="loading">Loading server details...</div>
  }

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
  }

  return (
    <div className="server-detail">
      <div className="detail-header">
        <button className="back-button" onClick={() => navigate(`/${type === 'dnsdist' ? 'dnsdist' : 'resolvers'}`)}>
          ← Back
        </button>
        <div className="header-info">
          <h1>{server.hostname}</h1>
          <p className="server-ip">{server.ip}:{server.api_port}</p>
        </div>
        <div className="time-range-selector">
          <select value={timeRange} onChange={(e) => setTimeRange(Number(e.target.value))}>
            <option value={30}>Last 30 min</option>
            <option value={60}>Last 1 hour</option>
            <option value={180}>Last 3 hours</option>
            <option value={360}>Last 6 hours</option>
            <option value={720}>Last 12 hours</option>
            <option value={1440}>Last 24 hours</option>
          </select>
        </div>
      </div>

      <div className="stats-grid">
        <StatsCard title="QPS" value={Number(server.qps || 0).toLocaleString()} icon="⚡" color="#33d17a" />
        <StatsCard title="Cache Hit" value={`${Number(server.cache_hit_ratio || 0).toFixed(1)}%`} icon="💾" color="#f59e0b" />
        <StatsCard title="Total Queries" value={Number(server.queries || 0).toLocaleString()} icon="📈" color="#7b3aed" />
        <StatsCard title="Memory" value={formatBytes(Number(server.memory || 0))} icon="💿" color="#00d4ff" />
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>QPS History</h3>
          <QpsChart
            data={history.map(h => ({ ts: h.ts, qps: h.qps }))}
            height="300px"
          />
        </div>

        <div className="chart-card">
          <h3>Cache Hit Ratio</h3>
          <CacheHitChart data={history} height="300px" />
        </div>
      </div>

      <div className="metrics-section">
        <div className="metrics-card">
          <h3>Performance Metrics</h3>
          <div className="metrics-grid">
            <div className="metric-item">
              <span className="metric-label">Avg Latency</span>
              <span className="metric-value">{Number(server.latency_avg || 0).toFixed(1)} ms</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Cache Hits</span>
              <span className="metric-value">{Number(server.cache_hits || 0).toLocaleString()}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Cache Misses</span>
              <span className="metric-value">{Number(server.cache_misses || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="metrics-card">
          <h3>Rate Per Second</h3>
          <div className="metrics-grid">
            <div className="metric-item">
              <span className="metric-label">QPS</span>
              <span className="metric-value">{Number(server.qps || 0).toLocaleString()}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">NXDOMAIN/s</span>
              <span className="metric-value">{Number(server.nxdomain_delta || 0).toLocaleString()}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">SERVFAIL/s</span>
              <span className="metric-value" style={{ color: Number(server.servfail_delta) > 0 ? 'var(--color-warning)' : 'var(--color-ink)' }}>
                {Number(server.servfail_delta || 0).toLocaleString()}
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Timeout/s</span>
              <span className="metric-value">{Number(server.downstreams_timeout_delta || 0).toLocaleString()}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">ACL Drop/s</span>
              <span className="metric-value">{Number(server.acl_drops_delta || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {isDnsdist && (
          <div className="metrics-card">
            <h3>dnsdist Specific</h3>
            <div className="metrics-grid">
              <div className="metric-item">
                <span className="metric-label">TCP Latency</span>
                <span className="metric-value">{Number(server.latency_tcp || 0).toFixed(1)} ms</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">UDP Latency</span>
                <span className="metric-value">{Number(server.latency_udp || 0).toFixed(1)} ms</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">ACL Drops</span>
                <span className="metric-value">{Number(server.acl_drops || 0).toLocaleString()}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Rule Drops</span>
                <span className="metric-value">{Number(server.rule_drop || 0).toLocaleString()}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Downstream Timeouts</span>
                <span className="metric-value">{Number(server.downstreams_timeout || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {!isDnsdist && (
          <div className="metrics-card">
            <h3>Resolver Specific</h3>
            <div className="metrics-grid">
              <div className="metric-item">
                <span className="metric-label">Packet Cache Hits</span>
                <span className="metric-value">{Number(server.packet_cache_hits || 0).toLocaleString()}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Packet Cache Misses</span>
                <span className="metric-value">{Number(server.packet_cache_misses || 0).toLocaleString()}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Concurrent Queries</span>
                <span className="metric-value">{Number(server.concurrent_queries || 0).toLocaleString()}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Timeouts</span>
                <span className="metric-value">{Number(server.timeouts || 0).toLocaleString()}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">DNSSEC Validations</span>
                <span className="metric-value">{Number(server.dnssec_validations || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
