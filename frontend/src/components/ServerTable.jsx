import './ServerTable.css'

export default function ServerTable({ servers, type, onRowClick }) {
  if (!servers || servers.length === 0) {
    return <div className="table-empty">No servers found</div>
  }

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
  }

  const isDnsdist = type === 'dnsdist'

  return (
    <div className="server-table-wrapper">
      <table className="server-table">
        <thead>
          <tr>
            <th>Hostname</th>
            <th>IP</th>
            <th>QPS</th>
            <th>Cache Hit</th>
            <th>Queries</th>
            <th>NXDOMAIN/s</th>
            <th>SERVFAIL/s</th>
            <th>Timeout/s</th>
            {isDnsdist && <th>ACL Drop/s</th>}
            <th>Latency</th>
            <th>Memory</th>
          </tr>
        </thead>
        <tbody>
          {servers.map(server => (
            <tr
              key={server.id}
              onClick={() => onRowClick?.(server.id)}
              className="clickable-row"
            >
              <td className="hostname-cell">
                <span className={`status-dot ${server.qps !== null ? 'online' : 'offline'}`} />
                {server.hostname}
              </td>
              <td className="ip-cell">{server.ip}</td>
              <td className="qps-cell">
                <strong>{Number(server.qps || 0).toLocaleString()}</strong>
              </td>
              <td className="cache-cell">
                <div className="cache-bar-wrapper">
                  <div
                    className="cache-bar"
                    style={{
                      width: `${Math.min(Number(server.cache_hit_ratio || 0), 100)}%`,
                      background: Number(server.cache_hit_ratio) > 50 ? '#10b981' : '#f59e0b'
                    }}
                  />
                  <span>{Number(server.cache_hit_ratio || 0).toFixed(1)}%</span>
                </div>
              </td>
              <td>{Number(server.queries || 0).toLocaleString()}</td>
              <td>{Number(server.nxdomain_delta || 0).toLocaleString()}</td>
              <td className={Number(server.servfail_delta) > 0 ? 'warn-cell' : ''}>
                {Number(server.servfail_delta || 0).toLocaleString()}
              </td>
              <td>{Number(isDnsdist ? server.downstreams_timeout_delta : server.timeouts_delta || 0).toLocaleString()}</td>
              {isDnsdist && <td>{Number(server.acl_drops_delta || 0).toLocaleString()}</td>}
              <td>{Number(server.latency_avg || 0).toFixed(1)} ms</td>
              <td>{formatBytes(Number(server.memory || 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
