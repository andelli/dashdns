import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const BrandingContext = createContext(null)

const DEFAULTS = {
  name: 'DashDNS',
  logoUrl: null,       // base64 data URL dari upload gambar
  faviconUrl: null,    // base64 data URL untuk browser tab icon
  color: '#0007cd'
}

function darkenHex(hex, amount = 30) {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - amount)
  const g = Math.max(0, ((num >> 8) & 0x00FF) - amount)
  const b = Math.max(0, (num & 0x0000FF) - amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function applyBrandVars(brand) {
  const root = document.documentElement
  root.style.setProperty('--color-primary', brand.color)
  root.style.setProperty('--color-primary-active', darkenHex(brand.color))
}

function applyFavicon(url) {
  let link = document.querySelector("link[rel~='icon']")
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = url || '/favicon.svg'
}

function applyTitle(name) {
  document.title = name ? `${name} - DNS Monitoring Dashboard` : 'DashDNS - DNS Monitoring Dashboard'
}

export function BrandingProvider({ children }) {
  const [brand, setBrand] = useState(() => {
    try {
      const stored = localStorage.getItem('dashdns-brand')
      const parsed = stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS
      return parsed
    } catch {
      return { ...DEFAULTS }
    }
  })

  // Sync to DOM & localStorage on mount and change
  useEffect(() => {
    localStorage.setItem('dashdns-brand', JSON.stringify(brand))
    applyBrandVars(brand)
    applyFavicon(brand.faviconUrl)
    applyTitle(brand.name)
  }, [brand])

  const updateBrand = useCallback((updates) => {
    setBrand(prev => ({ ...prev, ...updates }))
  }, [])

  const resetBrand = useCallback(() => {
    setBrand({ ...DEFAULTS })
    // Hapus localStorage biar bersih
    localStorage.removeItem('dashdns-brand')
  }, [])

  return (
    <BrandingContext.Provider value={{ brand, updateBrand, resetBrand }}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBrand() {
  const context = useContext(BrandingContext)
  if (!context) throw new Error('useBrand must be used within BrandingProvider')
  return context
}
