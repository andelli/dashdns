import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ChangePassword from './ChangePassword'
import './Layout.css'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [showChangePassword, setShowChangePassword] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>DashDNS</h2>
        </div>

        <nav className="sidebar-nav">
          <Link to="/" className={`nav-item ${isActive('/') && location.pathname === '/' ? 'active' : ''}`}>
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </Link>

          <Link to="/lookup" className={`nav-item ${isActive('/lookup') ? 'active' : ''}`}>
            <span className="nav-icon">🔍</span>
            <span>DNS Lookup</span>
          </Link>

          <Link to="/acl" className={`nav-item ${isActive('/acl') ? 'active' : ''}`}>
            <span className="nav-icon">🛡️</span>
            <span>ACL</span>
          </Link>

          <Link to="/settings" className={`nav-item ${isActive('/settings') ? 'active' : ''}`}>
            <span className="nav-icon">🔧</span>
            <span>Settings</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <div className="user-name">{user?.username}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
          <button onClick={() => setShowChangePassword(true)} className="change-password-button">
            🔑 Change Password
          </button>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>

      {showChangePassword && (
        <ChangePassword onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  )
}
