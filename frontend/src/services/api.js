import axios from 'axios'

const API_BASE = '/api'

const api = axios.create({
  baseURL: API_BASE
})

// Request interceptor - attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth
export const login = (username, password) =>
  api.post('/auth/login', { username, password })

export const getMe = () =>
  api.get('/auth/me')

export const changePassword = (currentPassword, newPassword) =>
  api.post('/auth/change-password', { currentPassword, newPassword })

// Dashboard
export const getOverview = () =>
  api.get('/dashboard/overview')

export const getQpsHistory = (minutes = 60) =>
  api.get(`/dashboard/qps?minutes=${minutes}`)

// Dnsdist
export const getDnsdistServers = () =>
  api.get('/dnsdist')

export const getDnsdistServer = (id) =>
  api.get(`/dnsdist/${id}`)

export const getDnsdistHistory = (id, minutes = 60) =>
  api.get(`/dnsdist/${id}/history?minutes=${minutes}`)

// Resolvers
export const getResolverServers = () =>
  api.get('/resolvers')

export const getResolverServer = (id) =>
  api.get(`/resolvers/${id}`)

export const getResolverHistory = (id, minutes = 60) =>
  api.get(`/resolvers/${id}/history?minutes=${minutes}`)

// Server Management
export const getServers = () =>
  api.get('/servers')

export const getServer = (id) =>
  api.get(`/servers/${id}`)

export const createServer = (data) =>
  api.post('/servers', data)

export const updateServer = (id, data) =>
  api.put(`/servers/${id}`, data)

export const deleteServer = (id) =>
  api.delete(`/servers/${id}`)

export const toggleServer = (id) =>
  api.patch(`/servers/${id}/toggle`)

// DNS Lookup
export const dnsLookup = (domain, type, server) =>
  api.post('/lookup', { domain, type, server })

export const dnsLookupMulti = (domain, type, servers) =>
  api.post('/lookup/multi', { domain, type, servers })

// ACL Management
export const getAclEntries = () =>
  api.get('/acl')

export const createAclEntry = (data) =>
  api.post('/acl', data)

export const updateAclEntry = (id, data) =>
  api.put(`/acl/${id}`, data)

export const deleteAclEntry = (id) =>
  api.delete(`/acl/${id}`)

export const toggleAclEntry = (id) =>
  api.patch(`/acl/${id}/toggle`)

export const exportAclConfig = () =>
  api.get('/acl/export', { responseType: 'text' })

export const deployAcl = () =>
  api.post('/acl/deploy')

export const previewDeploy = () =>
  api.post('/acl/preview-deploy')

export const syncAcl = () =>
  api.post('/acl/sync')

export const getLastDeploy = () =>
  api.get('/acl/last-deploy')

// Settings
export const getSettings = () =>
  api.get('/settings')

export const updateSettings = (data) =>
  api.put('/settings', data)

export const testSsh = (data) =>
  api.post('/settings/test-ssh', data)

// Top Queries / Top Remotes
export const getTopResolvers = () =>
  api.get('/top')

export const getResolverTopData = (resolverId) =>
  api.get(`/top/${resolverId}`)

// Health Check
export const getHealth = () =>
  api.get('/health')

// Domain Whitelist
export const getDomainEntries = () =>
  api.get('/domains')

export const createDomainEntry = (data) =>
  api.post('/domains', data)

export const updateDomainEntry = (id, data) =>
  api.put(`/domains/${id}`, data)

export const deleteDomainEntry = (id) =>
  api.delete(`/domains/${id}`)

export const previewDomainDeploy = () =>
  api.post('/domains/preview-deploy')

export const deployDomain = () =>
  api.post('/domains/deploy')

export const syncDomainDnsdist = () =>
  api.post('/domains/sync')

export const getDomainLastDeploy = () =>
  api.get('/domains/last-deploy')

export default api
