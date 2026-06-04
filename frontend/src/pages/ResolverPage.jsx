import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../services/api'
import ServerTable from '../components/ServerTable'
import StatsCard from '../components/StatsCard'
import './Dnsdist.css'

export default function ResolverPage() {
  const [servers, setServers] = useState([])
  const [health, setHealth] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const loadData = async () => {
    try {
      const [res, healthRes] = await Promise.all([
        api.getResolverServers(),
        api.getHealth()
      ])
      setServers(res.data)
      setHealth(healthRes.data)
    } catch (err) {
      console.error('Load resolvers error:', err)
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
    return <div className="loading">Loading resolver servers...</div>
  }

  const totalQps = servers.reduce((sum, s) => sum + Number(s.qps || 0), 0)
  const avgCacheHit = servers.length > 0
    ? servers.reduce((sum, s) => sum + Number(s.cache_hit_ratio || 0), 0) / servers.length
    : 0
  const totalQueries = servers.reduce((sum, s) => sum + Number(s.queries || 0), 0)

  return (
    <div className="resolver-page">
      <div className="page-header">
        <h1>Resolver Servers</h1>
        <p className="subtitle">PowerDNS Recursor upstream servers</p>
      </div>

      <div className="stats-grid">
        <StatsCard title="Servers" value={servers.length} icon="🔄" color="#0007cd" />
        <StatsCard title="Total QPS" value={totalQps.toLocaleString()} icon="⚡" color="#33d17a" />
        <StatsCard title="Avg Cache Hit" value={`${avgCacheHit.toFixed(1)}%`} icon="💾" color="#7b3aed" />
        <StatsCard title="Total Queries" value={totalQueries.toLocaleString()} icon="📈" color="#f59e0b" />
      </div>

      <div className="table-card">
        <h3>Server List</h3>
        <ServerTable
          servers={servers}
          type="resolver"
          onRowClick={(id) => navigate(`/resolvers/${id}`)}
          health={health}
        />
      </div>
    </div>
  )
}
