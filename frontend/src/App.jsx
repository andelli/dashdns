import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import DnsdistPage from './pages/DnsdistPage'
import ResolverPage from './pages/ResolverPage'
import ServerDetailPage from './pages/ServerDetailPage'
import LookupPage from './pages/LookupPage'
import TopPage from './pages/TopPage'
import AclPage from './pages/AclPage'
import DomainWhitelistPage from './pages/DomainWhitelistPage'
import SettingsPage from './pages/SettingsPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 16, color: '#888', fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 16, color: '#888', fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>Loading...</div>
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute><LoginPage /></PublicRoute>
      } />

      <Route element={
        <ProtectedRoute><Layout /></ProtectedRoute>
      }>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dnsdist" element={<DnsdistPage />} />
        <Route path="/resolvers" element={<ResolverPage />} />
        <Route path="/dnsdist/:id" element={<ServerDetailPage />} />
        <Route path="/resolvers/:id" element={<ServerDetailPage />} />
        <Route path="/lookup" element={<LookupPage />} />
        <Route path="/top" element={<TopPage />} />
        <Route path="/acl" element={<AclPage />} />
        <Route path="/domains" element={<DomainWhitelistPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
