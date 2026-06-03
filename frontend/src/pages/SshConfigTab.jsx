import { useEffect, useState } from 'react'
import * as api from '../services/api'

export default function SshConfigTab() {
  const [settings, setSettings] = useState({
    dnsdist_ssh_host: '', dnsdist_ssh_port: '22', dnsdist_ssh_user: 'root', dnsdist_ssh_key_path: '/root/.ssh/id_rsa'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState(null)
  const [msg, setMsg] = useState(null)

  const load = async () => {
    try {
      const res = await api.getSettings()
      setSettings(prev => ({ ...prev, ...res.data }))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    setSaving(true); setMsg(null)
    try { await api.updateSettings(settings); setMsg({ type: 'success', text: 'Settings saved successfully' }) }
    catch (err) { setMsg({ type: 'error', text: err.response?.data?.error || err.message }) }
    finally { setSaving(false) }
  }

  const handleTestSsh = async () => {
    setTesting(true); setTestResults(null); setMsg(null)
    try { const res = await api.testSsh(settings); setTestResults(res.data.results) }
    catch (err) { setMsg({ type: 'error', text: err.response?.data?.error || err.message }) }
    finally { setTesting(false) }
  }

  if (loading) return <div className="loading">Loading settings...</div>

  return (
    <div className="table-card">
      <h3>dnsdist SSH Configuration</h3>
      {msg && <div className={`deploy-msg ${msg.type}`} style={{ marginBottom: 16 }}>{msg.type === 'success' ? '✅' : '❌'} {msg.text}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
        <div className="form-group">
          <label>SSH Host(s)</label>
          <input type="text" placeholder="dnsdist01.example.com,dnsdist02.example.com" value={settings.dnsdist_ssh_host} onChange={e => setSettings({ ...settings, dnsdist_ssh_host: e.target.value })} />
          <span style={{ fontSize: 12, color: 'var(--color-muted-soft)' }}>Comma-separated untuk multiple servers</span>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>SSH Port</label>
            <input type="text" value={settings.dnsdist_ssh_port} onChange={e => setSettings({ ...settings, dnsdist_ssh_port: e.target.value })} />
          </div>
          <div className="form-group">
            <label>SSH User</label>
            <input type="text" value={settings.dnsdist_ssh_user} onChange={e => setSettings({ ...settings, dnsdist_ssh_user: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label>SSH Private Key Path</label>
          <input type="text" value={settings.dnsdist_ssh_key_path} onChange={e => setSettings({ ...settings, dnsdist_ssh_key_path: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
          <button className="btn btn-secondary" onClick={handleTestSsh} disabled={testing}>{testing ? 'Testing...' : '🔌 Test SSH Connection'}</button>
        </div>
        {testResults && (
          <div style={{ marginTop: 24 }}>
            <h4 style={{ color: 'var(--color-ink)', marginBottom: 12, fontWeight: 500 }}>Test Results:</h4>
            {testResults.map((r, i) => (
              <div key={i} className={`deploy-msg ${r.status === 'success' ? 'success' : 'error'}`} style={{ marginBottom: 8 }}>
                <strong>{r.host}</strong>: {r.status === 'success' ? '✅ Connected' : `❌ ${r.error}`}
                {r.hasAcl && <span> · setACL found in config</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
