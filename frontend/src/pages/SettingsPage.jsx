import { useState } from 'react'
import SshConfigTab from './SshConfigTab'
import ServersTab from './ServersTab'
import './ServersPage.css'

export default function SettingsPage() {
  const [tab, setTab] = useState('servers')

  return (
    <div className="servers-page">
      <div className="page-header">
        <h1>Settings</h1>
        <p className="subtitle">Manage servers and SSH configuration</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          className={`btn ${tab === 'servers' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('servers')}
        >
          Server Management
        </button>
        <button
          className={`btn ${tab === 'ssh' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('ssh')}
        >
          SSH Configuration
        </button>
      </div>

      {tab === 'servers' ? <ServersTab /> : <SshConfigTab />}
    </div>
  )
}
