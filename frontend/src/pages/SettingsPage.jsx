import { useState } from 'react'
import SshConfigTab from './SshConfigTab'
import ServersTab from './ServersTab'
import BrandingTab from './BrandingTab'
import './ServersPage.css'

export default function SettingsPage() {
  const [tab, setTab] = useState('servers')

  return (
    <div className="servers-page">
      <div className="page-header">
        <h1>Settings</h1>
        <p className="subtitle">Manage servers, branding, and SSH configuration</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <button
          className={`btn ${tab === 'servers' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('servers')}
        >
          🖥️ Servers
        </button>
        <button
          className={`btn ${tab === 'branding' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('branding')}
        >
          🎨 Branding
        </button>
        <button
          className={`btn ${tab === 'ssh' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('ssh')}
        >
          🔌 SSH
        </button>
      </div>

      {tab === 'servers' && <ServersTab />}
      {tab === 'branding' && <BrandingTab />}
      {tab === 'ssh' && <SshConfigTab />}
    </div>
  )
}
