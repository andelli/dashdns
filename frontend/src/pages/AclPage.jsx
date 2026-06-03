import { useEffect, useMemo, useState } from 'react'
import * as api from '../services/api'
import './AclPage.css'

export default function AclPage() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ip_or_subnet: '', description: '' })
  const [deploying, setDeploying] = useState(false)
  const [deployMsg, setDeployMsg] = useState(null)
  const [deployLogs, setDeployLogs] = useState([])
  const [showPreview, setShowPreview] = useState(false)
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [lastDeploy, setLastDeploy] = useState(null)

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('ip_or_subnet')
  const [sortDir, setSortDir] = useState('asc')

  const loadEntries = async () => {
    try {
      const [entriesRes, lastDeployRes] = await Promise.all([
        api.getAclEntries(),
        api.getLastDeploy().catch(() => ({ data: { lastDeploy: null } }))
      ])
      setEntries(entriesRes.data)
      setLastDeploy(lastDeployRes.data.lastDeploy)
    } catch (err) {
      console.error('Load ACL error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadEntries() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ ip_or_subnet: '', description: '' })
    setShowModal(true)
  }

  const openEdit = (entry) => {
    setEditing(entry)
    setForm({ ip_or_subnet: entry.ip_or_subnet, description: entry.description || '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      if (editing) {
        await api.updateAclEntry(editing.id, form)
      } else {
        await api.createAclEntry(form)
      }
      setShowModal(false)
      loadEntries()
    } catch (err) {
      console.error('Save ACL error:', err)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus entry ini?')) return
    try {
      await api.deleteAclEntry(id)
      loadEntries()
    } catch (err) {
      console.error('Delete ACL error:', err)
    }
  }

  const handleExport = async () => {
    try {
      const res = await api.exportAclConfig()
      const blob = new Blob([res.data], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'dnsdist-acl.conf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export ACL error:', err)
    }
  }

  const handleSync = async () => {
    if (!confirm('Sync ACL dari konfigurasi dnsdist server ke database?')) return
    setDeploying(true)
    setDeployMsg(null)
    try {
      const res = await api.syncAcl()
      setDeployMsg({ type: 'success', text: res.data.message })
      loadEntries()
    } catch (err) {
      setDeployMsg({ type: 'error', text: err.response?.data?.error || err.message })
    } finally {
      setDeploying(false)
    }
  }

  const handleDeploy = async () => {
    setDeploying(true)
    setDeployMsg(null)
    setDeployLogs([])
    try {
      const res = await api.deployAcl()
      setDeployMsg({ type: res.data.status === 'success' ? 'success' : 'error', text: res.data.message })
      if (res.data.logs) setDeployLogs(res.data.logs)
      loadEntries()
    } catch (err) {
      const data = err.response?.data
      setDeployMsg({ type: 'error', text: data?.error || err.message })
      if (data?.logs) setDeployLogs(data.logs)
    } finally {
      setDeploying(false)
      setShowPreview(false)
      setPreview(null)
    }
  }

  const handlePreviewAndDeploy = async () => {
    setPreviewLoading(true)
    setPreview(null)
    setDeployMsg(null)
    try {
      const res = await api.previewDeploy()
      setPreview(res.data)
      setShowPreview(true)
    } catch (err) {
      const data = err.response?.data
      setDeployMsg({ type: 'error', text: data?.error || err.message })
    } finally {
      setPreviewLoading(false)
    }
  }

  const filtered = useMemo(() => {
    let result = [...entries]
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(e =>
        e.ip_or_subnet.toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q)
      )
    }
    result.sort((a, b) => {
      const va = String(a[sortKey] || '').toLowerCase()
      const vb = String(b[sortKey] || '').toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [entries, search, sortKey, sortDir])

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sortIcon = (key) => {
    if (sortKey !== key) return ' ↕'
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  if (loading) {
    return <div className="loading">Loading ACL entries...</div>
  }

  return (
    <div className="acl-page">
      <div className="page-header">
        <h1>ACL Management</h1>
        <p className="subtitle">
          Whitelist IP/subnet untuk dnsdist
          {lastDeploy && <span style={{ color: 'var(--color-muted-soft)', marginLeft: 8 }}>· Last deploy: {new Date(lastDeploy).toLocaleString('id-ID')}</span>}
        </p>
      </div>

      <div className="action-bar">
        <button className="btn btn-primary" onClick={openAdd}>+ Add Entry</button>
        <button className="btn btn-secondary" onClick={handleExport}>📥 Export Config</button>
        <button className="btn btn-secondary" onClick={handleSync} disabled={deploying}>📥 Sync from dnsdist</button>
        <button className="btn btn-primary" onClick={handlePreviewAndDeploy} disabled={previewLoading || deploying}>
          {previewLoading ? '⏳ Loading...' : deploying ? '⏳ Deploying...' : '🚀 Deploy'}
        </button>
      </div>

      {deployMsg && (
        <div className={`deploy-msg ${deployMsg.type}`}>
          {deployMsg.type === 'success' ? '✅' : '❌'} {deployMsg.text}
        </div>
      )}

      {deployLogs.length > 0 && (
        <div style={{
          background: 'var(--color-canvas-deep)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-base)',
          marginBottom: 'var(--space-base)',
          border: '1px solid var(--color-hairline)',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          lineHeight: 1.6,
          maxHeight: 300,
          overflowY: 'auto'
        }}>
          <div style={{ color: 'var(--color-muted)', marginBottom: 8, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.88px', fontWeight: 600 }}>
            📋 Execution Logs
          </div>
          {deployLogs.map((line, i) => {
            const isError = line.includes('ERROR') || line.includes('FAILED') || line.includes('FATAL')
            const isSuccess = line.includes('✓') || line.includes('success')
            const isHost = line.includes('=== Processing')
            return (
              <div key={i} style={{
                color: isError ? 'var(--color-error)' : isSuccess ? 'var(--color-success)' : isHost ? 'var(--color-ink)' : 'var(--color-body)',
                fontWeight: isHost ? 600 : 400,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {line}
              </div>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <input
          type="text"
          style={{
            flex: 1,
            minWidth: 200,
            padding: '8px 12px',
            height: 40,
            background: 'var(--color-surface-card)',
            color: 'var(--color-body-strong)',
            border: '1px solid var(--color-hairline)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            outline: 'none'
          }}
          placeholder="🔍 Search IP or description..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span style={{ fontSize: 13, color: 'var(--color-muted-soft)', whiteSpace: 'nowrap' }}>{filtered.length} of {entries.length}</span>
      </div>

      <div className="table-card">
        <div className="acl-table-wrapper">
          <table className="acl-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => toggleSort('ip_or_subnet')}>IP / Subnet{sortIcon('ip_or_subnet')}</th>
                <th className="sortable" onClick={() => toggleSort('description')}>Description{sortIcon('description')}</th>
                <th className="sortable" onClick={() => toggleSort('created_at')}>Created{sortIcon('created_at')}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-row">{entries.length === 0 ? 'Belum ada ACL entries' : 'No entries match search'}</td>
                </tr>
              ) : (
                filtered.map(entry => (
                  <tr key={entry.id}>
                    <td className="ip-cell">{entry.ip_or_subnet}</td>
                    <td>{entry.description || '-'}</td>
                    <td className="date-cell">{new Date(entry.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="actions-cell">
                      <button className="btn-icon" onClick={() => openEdit(entry)} title="Edit">✏️</button>
                      <button className="btn-icon btn-danger" onClick={() => handleDelete(entry.id)} title="Hapus">🗑️</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showPreview && preview && (
        <div className="modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h2>Deploy Preview — {preview.totalAcl} Entries</h2>
              <button className="close-button" onClick={() => setShowPreview(false)}>×</button>
            </div>
            <div style={{ maxHeight: '60vh', overflowY: 'auto', marginBottom: 16 }}>
              {preview.previews?.map((p, i) => {
                if (p.status === 'error') {
                  return (
                    <div key={i} style={{ marginBottom: 16 }}>
                      <h4 style={{ color: 'var(--color-error)', marginBottom: 8, fontSize: 14 }}>❌ {p.host} — {p.error}</h4>
                    </div>
                  )
                }
                const parseAclIps = (cfg) => {
                  const m = cfg.match(/setACL\(\{([\s\S]*?)\}\)/)
                  if (!m) return []
                  return [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1]).filter(Boolean)
                }
                const oldIps = parseAclIps(p.oldConfig)
                const newIps = parseAclIps(p.newConfig)
                const removed = oldIps.filter(ip => !newIps.includes(ip))
                const added = newIps.filter(ip => !oldIps.includes(ip))
                return (
                <div key={i} style={{ marginBottom: 16 }}>
                  <h4 style={{ color: 'var(--color-ink)', marginBottom: 8, fontSize: 14 }}>🖥️ {p.host}</h4>
                  {removed.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ color: 'var(--color-error)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>🗑️ Removed ({removed.length})</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {removed.map(ip => (
                          <span key={ip} style={{
                            background: 'rgba(255,77,77,0.1)',
                            color: 'var(--color-error)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 12,
                            border: '1px solid rgba(255,77,77,0.2)'
                          }}>{ip}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {added.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ color: 'var(--color-success)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>✅ Added ({added.length})</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {added.map(ip => (
                          <span key={ip} style={{
                            background: 'rgba(51,209,122,0.1)',
                            color: 'var(--color-success)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 12,
                            border: '1px solid rgba(51,209,122,0.2)'
                          }}>{ip}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {removed.length === 0 && added.length === 0 && (
                    <div style={{ color: 'var(--color-muted)', fontSize: 13 }}>No changes — ACL entries are the same.</div>
                  )}
                </div>
              )})}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowPreview(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { setShowPreview(false); handleDeploy(); }}>
                ✅ Confirm & Deploy
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Entry' : 'Add Entry'}</h2>
              <button className="close-button" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="acl-form">
              <div className="form-group">
                <label>IP / Subnet *</label>
                <input type="text" placeholder="192.168.1.0/24, 10.0.0.5, etc." value={form.ip_or_subnet} onChange={e => setForm({ ...form, ip_or_subnet: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" placeholder="Office network, VPN, etc." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Add'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
