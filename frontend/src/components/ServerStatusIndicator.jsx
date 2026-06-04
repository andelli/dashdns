import './ServerStatusIndicator.css'

export default function ServerStatusIndicator({ servers, type }) {
  const isResolver = type === 'resolver'
  const onlineServers = servers.filter(s => isResolver ? s.is_up : (s.queries !== null && s.queries !== undefined))
  const offlineServers = servers.filter(s => isResolver ? !s.is_up : (s.queries === null || s.queries === undefined))
  
  const total = servers.length
  const online = onlineServers.length
  const pct = total > 0 ? Math.round((online / total) * 100) : 0
  
  return (
    <div className="status-bar">
      <span className="status-bar-icon">{type === 'dnsdist' ? '🔀' : '🔄'}</span>
      <span className="status-bar-label">{type === 'dnsdist' ? 'dnsdist' : 'Resolver'}</span>
      <div className="status-bar-track">
        <div className="status-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="status-bar-text">{online}/{total} online</span>
      {pct < 100 && (
        <span className="status-bar-offline" title={offlineServers.map(s => s.hostname).join(', ')}>
          ⚠️
        </span>
      )}
    </div>
  )
}
