import './DnsRecordCard.css'

export default function DnsRecordCard({ answer, type, index }) {
  // Prefer recordType from backend (especially for ANY queries), fallback to page type
  const t = (answer?.recordType || type || '').toUpperCase()

  if (!answer || typeof answer !== 'object') {
    return (
      <div className="dns-record-card">
        <div className="record-value mono">{String(answer)}</div>
      </div>
    )
  }

  const { value, ttl } = answer
  const displayValue = value || answer.issue || answer.address || ''

  const formatTtl = (s) => {
    if (s == null) return null
    if (s < 60) return `${s}s`
    if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`
    if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
    return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`
  }

  if (t === 'A' || t === 'AAAA') {
    return (
      <div className="dns-record-card type-addr">
        <div className="record-value mono">{answer.value || answer.address || value}</div>
        {ttl != null && <div className="record-ttl">TTL {formatTtl(ttl)}</div>}
      </div>
    )
  }

  if (t === 'MX') {
    return (
      <div className="dns-record-card type-mx">
        <div className="record-row">
          <span className="record-label">Priority</span>
          <span className="record-value mono priority-badge">{answer.priority}</span>
        </div>
        <div className="record-row">
          <span className="record-label">Mail Server</span>
          <span className="record-value mono">{answer.exchange}</span>
        </div>
        {ttl != null && <div className="record-ttl">TTL {formatTtl(ttl)}</div>}
      </div>
    )
  }

  if (t === 'SOA') {
    return (
      <div className="dns-record-card type-soa">
        <div className="soa-grid">
          <div className="soa-field">
            <span className="record-label">Nameserver</span>
            <span className="record-value mono">{answer.nsname}</span>
          </div>
          <div className="soa-field">
            <span className="record-label">Hostmaster</span>
            <span className="record-value mono">{answer.hostmaster}</span>
          </div>
          <div className="soa-field">
            <span className="record-label">Serial</span>
            <span className="record-value mono serial-value">{answer.serial?.toLocaleString()}</span>
          </div>
          <div className="soa-field">
            <span className="record-label">Refresh</span>
            <span className="record-value mono">{formatTtl(answer.refresh)}</span>
          </div>
          <div className="soa-field">
            <span className="record-label">Retry</span>
            <span className="record-value mono">{formatTtl(answer.retry)}</span>
          </div>
          <div className="soa-field">
            <span className="record-label">Expire</span>
            <span className="record-value mono">{formatTtl(answer.expire)}</span>
          </div>
          <div className="soa-field">
            <span className="record-label">Min TTL</span>
            <span className="record-value mono">{formatTtl(answer.minttl)}</span>
          </div>
        </div>
      </div>
    )
  }

  if (t === 'SRV') {
    return (
      <div className="dns-record-card type-srv">
        <div className="record-row">
          <span className="record-label">Priority</span>
          <span className="record-value mono priority-badge">{answer.priority}</span>
        </div>
        <div className="record-row">
          <span className="record-label">Weight</span>
          <span className="record-value mono">{answer.weight}</span>
        </div>
        <div className="record-row">
          <span className="record-label">Port</span>
          <span className="record-value mono">{answer.port}</span>
        </div>
        <div className="record-row">
          <span className="record-label">Target</span>
          <span className="record-value mono">{answer.name}</span>
        </div>
      </div>
    )
  }

  if (t === 'CAA') {
    return (
      <div className="dns-record-card type-caa">
        <div className="record-row">
          <span className="record-label">Flags</span>
          <span className="record-value mono">{answer.critical ? 'Critical' : '0'}</span>
        </div>
        <div className="record-row">
          <span className="record-label">Tag</span>
          <span className="record-value mono">{answer.tag}</span>
        </div>
        <div className="record-row">
          <span className="record-label">Value</span>
          <span className="record-value mono">{answer.value}</span>
        </div>
      </div>
    )
  }

  // TXT, NS, CNAME, PTR, ANY — plain value display
  return (
    <div className="dns-record-card type-generic">
      <div className="record-value mono">{displayValue}</div>
      {ttl != null && <div className="record-ttl">TTL {formatTtl(ttl)}</div>}
    </div>
  )
}
