import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../services/api'
import StatsCard from '../components/StatsCard'
import QpsChart from '../components/QpsChart'
import CacheHitChart from '../components/CacheHitChart'
import ServerTable from '../components/ServerTable'
import ServerStatusIndicator from '../components/ServerStatusIndicator'
import './Dashboard.css'

export default function DashboardPage() {
  const [overview, setOverview] = useState(null)
  const [qpsData, setQpsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const loadData = async () => {
    try {
      const [overviewRes, qpsRes] = await Promise.all([
        api.getOverview(),
        api.getQpsHistory(60)
      ])
      setOverview(overviewRes.data)
      setQpsData(qpsRes.data)
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <div className="loading">Loading dashboard...</div>
  }

  if (!overview) {
    return <div className="error">Failed to load dashboard</div>
  }

  const { totals, dnsdist, resolvers } = overview
  const allServers = [...dnsdist, ...resolvers]
  const offlineServers = allServers.filter(s => !s.qps && s.qps !== 0 && s.ts === null)
  const onlineCount = allServers.length - offlineServers.length

  // dnsdist aggregated stats
  const dnsdistQps = dnsdist.reduce((sum, s) => sum + Number(s.qps || 0), 0)
  const dnsdistCache = dnsdist.length > 0
    ? dnsdist.reduce((sum, s) => sum + Number(s.cache_hit_ratio || 0), 0) / dnsdist.length : 0
  const dnsdistServfail = dnsdist.reduce((sum, s) => sum + Number(s.servfail_delta || 0), 0)
  const dnsdistTimeout = dnsdist.reduce((sum, s) => sum + Number(s.downstreams_timeout_delta || 0), 0)
  const dnsdistAclDrop = dnsdist.reduce((sum, s) => sum + Number(s.acl_drops_delta || 0), 0)

  // Resolver aggregated stats
  const resolverQps = resolvers.reduce((sum, s) => sum + Number(s.qps || 0), 0)
  const resolverCache = resolvers.length > 0
    ? resolvers.reduce((sum, s) => sum + Number(s.cache_hit_ratio || 0), 0) / resolvers.length : 0
  const resolverServfail = resolvers.reduce((sum, s) => sum + Number(s.servfail_delta || 0), 0)
  const resolverTimeout = resolvers.reduce((sum, s) => sum + Number(s.timeouts_delta || 0), 0)

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: '0 0 4px 0' }}>Dashboard</h1>
          <p className="subtitle" style={{ margin: 0, color: '#666' }}>
            Real-time DNS monitoring · {totals.servers} servers · Refresh 10s
          </p>
        </div>
      </div>

      {offlineServers.length > 0 && (
        <div className="health-alert">
          ⚠️ {offlineServers.length} server{offlineServers.length > 1 ? 's' : ''} offline — {onlineCount} of {allServers.length} operational
        </div>
      )}

      {/* ============= GLOBAL STATS ============= */}
      <div className="section-label">
        <span className="section-icon">📊</span> Global Overview
      </div>
      <div className="stats-grid">
        <StatsCard title="Total Servers" value={totals.servers} icon="🖥️" color="#2a5298" />
        <StatsCard title="Total QPS" value={totals.totalQps.toLocaleString()} icon="⚡" color="#10b981" />
        <StatsCard title="Total Queries" value={totals.totalQueries.toLocaleString()} icon="📊" color="#ef4444" />
        <StatsCard title="Memory" value={totals.totalMemory ? `${(totals.totalMemory / 1024 / 1024 / 1024).toFixed(1)} GB` : 'N/A'} icon="💿" color="#06b6d4" />
      </div>

      {/* QPS Chart (all servers) */}
      <div className="charts-section">
        <div className="chart-card">
          <h3>QPS Trend · All Servers</h3>
          <QpsChart data={qpsData} />
        </div>
      </div>

      {/* ============= DNSDIST SECTION ============= */}
      <div className="section-label">
        <span className="section-icon">🔀</span> dnsdist — Frontend Load Balancer
      </div>

      <div className="stats-grid">
        <StatsCard title="Servers" value={dnsdist.length} icon="🔀" color="#2a5298" />
        <StatsCard title="QPS" value={dnsdistQps.toLocaleString()} icon="⚡" color="#10b981" subtitle="Frontend" />
        <StatsCard title="Cache Hit" value={`${dnsdistCache.toFixed(1)}%`} icon="💾" color="#f59e0b" subtitle="Average" />
        <StatsCard title="SERVFAIL/s" value={dnsdistServfail.toLocaleString()} icon="❌" color="#ef4444" subtitle="Rate" />
        <StatsCard title="Timeout/s" value={dnsdistTimeout.toLocaleString()} icon="⏰" color="#f59e0b" subtitle="Downstream" />
        <StatsCard title="ACL Drop/s" value={dnsdistAclDrop.toLocaleString()} icon="🛡️" color="#8b5cf6" subtitle="Rate" />
      </div>

      <div className="status-grid" style={{ marginBottom: 16 }}>
        <ServerStatusIndicator servers={dnsdist} type="dnsdist" />
      </div>

      <div className="table-card" style={{ marginBottom: 32 }}>
        <h3>dnsdist Servers</h3>
        <ServerTable servers={dnsdist} type="dnsdist" onRowClick={(id) => navigate(`/dnsdist/${id}`)} />
      </div>

      {/* ============= RESOLVER SECTION ============= */}
      <div className="section-label">
        <span className="section-icon">🔄</span> Resolver — PowerDNS Recursor
      </div>

      <div className="stats-grid">
        <StatsCard title="Servers" value={resolvers.length} icon="🔄" color="#2a5298" />
        <StatsCard title="QPS" value={resolverQps.toLocaleString()} icon="⚡" color="#10b981" subtitle="Backend" />
        <StatsCard title="Cache Hit" value={`${resolverCache.toFixed(1)}%`} icon="💾" color="#8b5cf6" subtitle="Average" />
      </div>

      <div className="status-grid" style={{ marginBottom: 16 }}>
        <ServerStatusIndicator servers={resolvers} type="resolver" />
      </div>

      <div className="table-card">
        <h3>Resolver Servers</h3>
        <ServerTable servers={resolvers} type="resolver" onRowClick={(id) => navigate(`/resolvers/${id}`)} />
      </div>
    </div>
  )
}
