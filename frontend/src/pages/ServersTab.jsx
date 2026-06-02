import { useEffect, useState } from 'react'
import * as api from '../services/api'
import './ServersPage.css'

export default function ServersTab() {
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingServer, setEditingServer] = useState(null)
  const [formData, setFormData] = useState({
    hostname: '', ip: '', api_port: 8083, type: 'dnsdist', api_key: '', enabled: true
  })

  const loadServers = async () => {
    try {
      const res = await api.getServers()
      setServers(res.data)
    } catch (err) {
      console.error('Load servers error:', err)
    } finally { setLoading(false) }
  }

  useEffect(() => { loadServers() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingServer) await api.updateServer(editingServer.id, formData)
      else await api.createServer(formData)
      setShowForm(false); setEditingServer(null)
      resetForm(); loadServers()
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleDelete = async (id, hostname) => {
    if (!confirm(`Hapus ${hostname}?`)) return
    try { await api.deleteServer(id); loadServers() }
    catch (err) { alert('Failed to delete') }
  }

  const handleToggle = async (id) => {
    try { await api.toggleServer(id); loadServers() }
    catch (err) { console.error(err) }
  }

  const resetForm = () => setFormData({ hostname: '', ip: '', api_port: 8083, type: 'dnsdist', api_key: '', enabled: true })
  const handleCancel = () => { setShowForm(false); setEditingServer(null); resetForm() }

  if (loading) return <div className="loading">Loading servers...</div>

  return (
    <div>
      <div className="action-bar">
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingServer(null); resetForm() }}>
          + Add Server
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingServer ? 'Edit Server' : 'Add Server'}</h2>
              <button className="close-button" onClick={handleCancel}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="server-form">
              <div className="form-group">
                <label>Hostname</label>
                <input type="text" value={formData.hostname} onChange={e => setFormData({...formData, hostname: e.target.value})} placeholder="dnsdist01" required />
              </div>
              <div className="form-group">
                <label>IP Address</label>
                <input type="text" value={formData.ip} onChange={e => setFormData({...formData, ip: e.target.value})} placeholder="<IP_ADDRESS>" required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>API Port</label>
                  <input type="number" value={formData.api_port} onChange={e => setFormData({...formData, api_port: parseInt(e.target.value)})} required />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="dnsdist">dnsdist</option>
                    <option value="resolver">Resolver</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>API Key (optional)</label>
                <input type="text" value={formData.api_key} onChange={e => setFormData({...formData, api_key: e.target.value})} placeholder="Leave empty to use default" />
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={formData.enabled} onChange={e => setFormData({...formData, enabled: e.target.checked})} />
                  Enabled
                </label>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingServer ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-card">
        <h3>Servers ({servers.length})</h3>
        <div className="server-table-wrapper">
          <table className="server-table">
            <thead>
              <tr>
                <th>Hostname</th><th>IP</th><th>Port</th><th>Type</th><th>Status</th><th>Last Seen</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {servers.map(s => (
                <tr key={s.id}>
                  <td className="hostname-cell"><span className={`status-dot ${s.enabled ? 'online' : 'offline'}`} />{s.hostname}</td>
                  <td className="ip-cell">{s.ip}</td>
                  <td>{s.api_port}</td>
                  <td><span className={`type-badge ${s.type}`}>{s.type}</span></td>
                  <td><button className={`toggle-btn ${s.enabled ? 'enabled' : 'disabled'}`} onClick={() => handleToggle(s.id)}>{s.enabled ? 'Enabled' : 'Disabled'}</button></td>
                  <td className="date-cell">{s.last_seen ? new Date(s.last_seen).toLocaleString() : 'Never'}</td>
                  <td className="actions-cell">
                    <button className="btn-icon" onClick={() => { setEditingServer(s); setFormData({ hostname: s.hostname, ip: s.ip, api_port: s.api_port, type: s.type, api_key: '', enabled: s.enabled }); setShowForm(true) }}>✏️</button>
                    <button className="btn-icon btn-danger" onClick={() => handleDelete(s.id, s.hostname)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
