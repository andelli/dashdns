import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../services/api'
import ServerTable from '../components/ServerTable'
import StatsCard from '../components/StatsCard'
import './Dnsdist.css'

export default function DnsdistPage() {
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const loadData = async () => {
    try {
      const res = await api.getDnsdistServers()
      setServers(res.data)
    } catch (err) {
      console.error('Load dnsdist error:', err)
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
    return <div className="loading">Loading dnsdist servers...</div>
  }

  const totalQps = servers.reduce((sum, s) => sum + Number(s.qps || 0), 0)
  const avgCacheHit = servers.length > 0
    ? servers.reduce((sum, s) => sum + Number(s.cache_hit_ratio || 0), 0) / servers.length
    : 0
  const totalQueries = servers.reduce((sum, s) => sum + Number(s.queries || 0), 0)
  const totalMemory = servers.reduce((sum, s) => sum + Number(s.memory || 0), 0)

  return (
    <div className="dnsdist-page">
      <div className="page-header">
        <h1>dnsdist Servers</h1>
        <p className="subtitle">DNS load balancers and cache servers</p>
      </div>

      <div className="stats-grid">
        <StatsCard
          title="Servers"
          value={servers.length}
          icon="🔀"
          color="#2a5298"
        />
        <StatsCard
          title="Total QPS"
          value={totalQps.toLocaleString()}
          icon="⚡"
          color="#10b981"
        />
        <StatsCard
          title="Avg Cache Hit"
          value={`${avgCacheHit.toFixed(1)}%`}
          icon="💾"
          color="#f59e0b"
        />
        <StatsCard
          title="Total Queries"
          value={totalQueries.toLocaleString()}
          icon="📈"
          color="#8b5cf6"
        />
      </div>

      <div className="table-card">
        <h3>Server List</h3>
        <ServerTable
          servers={servers}
          type="dnsdist"
          onRowClick={(id) => navigate(`/dnsdist/${id}`)}
        />
      </div>
    </div>
  )
}
