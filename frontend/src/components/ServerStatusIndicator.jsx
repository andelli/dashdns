import './ServerStatusIndicator.css'

export default function ServerStatusIndicator({ servers, type }) {
  const onlineServers = servers.filter(s => s.queries !== null && s.queries !== undefined)
  const offlineServers = servers.filter(s => s.queries === null || s.queries === undefined)
  
  const onlineCount = onlineServers.length
  const offlineCount = offlineServers.length
  const totalCount = servers.length
  
  const healthPercentage = totalCount > 0 ? Math.round((onlineCount / totalCount) * 100) : 0
  
  return (
    <div className="status-indicator">
      <div className="status-header">
        <h3>{type === 'dnsdist' ? '🔀 dnsdist' : '🔄 Resolvers'} Status</h3>
        <div className={`status-badge ${healthPercentage === 100 ? 'healthy' : healthPercentage >= 50 ? 'warning' : 'critical'}`}>
          {healthPercentage}% Healthy
        </div>
      </div>
      
      <div className="status-summary">
        <div className="status-item online">
          <div className="status-icon">✅</div>
          <div className="status-info">
            <div className="status-count">{onlineCount}</div>
            <div className="status-label">Online</div>
          </div>
        </div>
        
        <div className="status-item offline">
          <div className="status-icon">❌</div>
          <div className="status-info">
            <div className="status-count">{offlineCount}</div>
            <div className="status-label">Offline</div>
          </div>
        </div>
        
        <div className="status-item total">
          <div className="status-icon">📊</div>
          <div className="status-info">
            <div className="status-count">{totalCount}</div>
            <div className="status-label">Total</div>
          </div>
        </div>
      </div>
      
      {offlineCount > 0 && (
        <div className="offline-list">
          <div className="offline-title">⚠️ Offline Servers:</div>
          {offlineServers.map(server => (
            <div key={server.id} className="offline-server">
              <span className="server-name">{server.hostname}</span>
              <span className="server-ip">{server.ip}:{server.api_port}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
