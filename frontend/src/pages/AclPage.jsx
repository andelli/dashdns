import { useEffect, useMemo, useState } from 'react'
import * as api from '../services/api'
import './AclPage.css'

export default function AclPage() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ip_or_subnet: '', description: '', type: 'whitelist' })
  const [deploying, setDeploying] = useState(false)
  const [deployMsg, setDeployMsg] = useState(null)

  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('ip_or_subnet')
  const [sortDir, setSortDir] = useState('asc')

  const loadEntries = async () => {
    try {
      const res = await api.getAclEntries()
      setEntries(res.data)
    } catch (err) {
      console.error('Load ACL error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadEntries() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ ip_or_subnet: '', description: '', type: 'whitelist' })
    setShowModal(true)
  }

  const openEdit = (entry) => {
    setEditing(entry)
    setForm({ ip_or_subnet: entry.ip_or_subnet, description: entry.description || '', type: entry.type })
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

  const handleToggle = async (id) => {
    try {
      await api.toggleAclEntry(id)
      loadEntries()
    } catch (err) {
      console.error('Toggle ACL error:', err)
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
    if (!confirm('Deploy whitelist ke dnsdist server via SSH?')) return
    setDeploying(true)
    setDeployMsg(null)
    try {
      const res = await api.deployAcl()
      setDeployMsg({ type: 'success', text: res.data.message })
      loadEntries()
    } catch (err) {
      setDeployMsg({ type: 'error', text: err.response?.data?.error || err.message })
    } finally {
      setDeploying(false)
    }
  }

  const filtered = useMemo(() => {
    let result = [...entries]
    if (filterType !== 'all') result = result.filter(e => e.type === filterType)
    if (filterStatus !== 'all') result = result.filter(e => e.enabled === (filterStatus === 'enabled'))
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(e =>
        e.ip_or_subnet.toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q)
      )
    }
    result.sort((a, b) => {
      let va = a[sortKey] || ''
      let vb = b[sortKey] || ''
      if (sortKey === 'created_at') {
        va = new Date(va).getTime()
        vb = new Date(vb).getTime()
      } else {
        va = String(va).toLowerCase()
        vb = String(vb).toLowerCase()
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [entries, filterType, filterStatus, search, sortKey, sortDir])

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
        <p className="subtitle">Manage whitelist dan blacklist untuk dnsdist</p>
      </div>

      <div className="action-bar">
        <button className="btn btn-primary" onClick={openAdd}>+ Add Entry</button>
        <button className="btn btn-secondary" onClick={handleExport}>📥 Export Config</button>
        <button className="btn btn-secondary" onClick={handleSync} disabled={deploying}>📥 Sync from dnsdist</button>
        <button className="btn btn-secondary" onClick={handleDeploy} disabled={deploying}>
          {deploying ? '⏳ Deploying...' : '🚀 Deploy to dnsdist'}
        </button>
      </div>

      {deployMsg && (
        <div className={`deploy-msg ${deployMsg.type}`}>
          {deployMsg.type === 'success' ? '✅' : '❌'} {deployMsg.text}
        </div>
      )}

      <div className="acl-filters">
        <input
          type="text"
          className="acl-search-input"
          placeholder="🔍 Search IP or description..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="acl-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          <option value="whitelist">Whitelist</option>
          <option value="blacklist">Blacklist</option>
        </select>
        <select className="acl-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>
        <span className="acl-count">{filtered.length} of {entries.length}</span>
      </div>

      <div className="table-card">
        <div className="acl-table-wrapper">
          <table className="acl-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => toggleSort('ip_or_subnet')}>IP / Subnet{sortIcon('ip_or_subnet')}</th>
                <th className="sortable" onClick={() => toggleSort('description')}>Description{sortIcon('description')}</th>
                <th className="sortable" onClick={() => toggleSort('type')}>Type{sortIcon('type')}</th>
                <th>Status</th>
                <th className="sortable" onClick={() => toggleSort('created_at')}>Created{sortIcon('created_at')}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-row">{entries.length === 0 ? 'Belum ada ACL entries' : 'No entries match filter'}</td>
                </tr>
              ) : (
                filtered.map(entry => (
                  <tr key={entry.id}>
                    <td className="ip-cell">{entry.ip_or_subnet}</td>
                    <td>{entry.description || '-'}</td>
                    <td><span className={`type-badge ${entry.type}`}>{entry.type}</span></td>
                    <td>
                      <button className={`toggle-btn ${entry.enabled ? 'enabled' : 'disabled'}`} onClick={() => handleToggle(entry.id)}>
                        {entry.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
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
              <div className="form-group">
                <label>Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="whitelist">Whitelist</option>
                  <option value="blacklist">Blacklist</option>
                </select>
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
