import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useBrand } from '../context/BrandingContext'
import ChangePassword from './ChangePassword'
import './Layout.css'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { brand } = useBrand()
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
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt={brand.name} style={{ height: 28, width: 'auto', maxWidth: 120, objectFit: 'contain' }} />
          ) : (
            <>
              <span className="brand-accent" style={{ background: brand.color }} />
              <h2>{brand.name}</h2>
            </>
          )}
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

          <Link to="/domains" className={`nav-item ${isActive('/domains') ? 'active' : ''}`}>
            <span className="nav-icon">🌐</span>
            <span>Domain Whitelist</span>
          </Link>

          <Link to="/settings" className={`nav-item ${isActive('/settings') ? 'active' : ''}`}>
            <span className="nav-icon">⚙️</span>
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
          <div className="sidebar-footer-actions">
            <button onClick={toggleTheme} className="sidebar-footer-btn">
              {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>
            <button onClick={() => setShowChangePassword(true)} className="sidebar-footer-btn">
              🔑 Change Password
            </button>
            <button onClick={handleLogout} className="sidebar-footer-btn logout">
              ⏻ Logout
            </button>
          </div>
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
