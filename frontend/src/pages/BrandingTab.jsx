import { useState, useRef } from 'react'
import { useBrand } from '../context/BrandingContext'

const PRESET_COLORS = [
  '#0007cd', '#0ea5e9', '#06b6d4', '#10b981', '#16a34a',
  '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#a855f7',
  '#6366f1', '#3b82f6', '#14b8a6', '#84cc16', '#eab308'
]

function readFileAsDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.readAsDataURL(file)
  })
}

const ACCEPT_IMAGE = 'image/png,image/jpeg,image/svg+xml,image/webp,image/gif'

export default function BrandingTab() {
  const { brand, updateBrand, resetBrand } = useBrand()
  const [customColor, setCustomColor] = useState(brand.color)
  const logoInputRef = useRef(null)
  const faviconInputRef = useRef(null)

  const handleSaveColor = (color) => {
    setCustomColor(color)
    updateBrand({ color })
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await readFileAsDataURL(file)
    updateBrand({ logoUrl: dataUrl })
    e.target.value = ''
  }

  const handleFaviconUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await readFileAsDataURL(file)
    updateBrand({ faviconUrl: dataUrl })
    e.target.value = ''
  }

  const handleRemoveLogo = () => {
    updateBrand({ logoUrl: null })
  }

  const handleRemoveFavicon = () => {
    updateBrand({ faviconUrl: null })
  }

  const handleReset = () => {
    resetBrand()
    setCustomColor('#0007cd')
  }

  return (
    <div className="table-card">
      <h3>Branding</h3>
      <p style={{ color: 'var(--color-muted)', fontSize: 14, marginBottom: 24 }}>
        Upload logo dan favicon untuk tampilan dashboard. Format: PNG, SVG, JPG, WebP.
      </p>

      {/* Preview */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: 20,
          background: 'var(--color-surface-card-elevated)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 24,
          border: '1px solid var(--color-hairline)'
        }}
      >
        {brand.logoUrl ? (
          <img src={brand.logoUrl} alt="logo" style={{ height: 48, width: 'auto', maxWidth: 160, objectFit: 'contain' }} />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-md)',
              background: customColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              color: '#fff'
            }}
          >
            D
          </div>
        )}
        <div>
          <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-ink)' }}>{brand.name}</div>
          <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 2 }}>
            {brand.logoUrl ? '✓ Logo custom' : 'Default logo'} · Accent: {customColor}
            {brand.faviconUrl && ' · ✓ Favicon custom'}
          </div>
        </div>
      </div>

      {/* Logo Upload */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--color-body)', marginBottom: 8 }}>
          Logo Perusahaan
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            ref={logoInputRef}
            type="file"
            accept={ACCEPT_IMAGE}
            onChange={handleLogoUpload}
            style={{ display: 'none' }}
          />
          <button className="btn btn-primary" onClick={() => logoInputRef.current?.click()}>
            📁 Upload Logo
          </button>
          {brand.logoUrl && (
            <button className="btn btn-ghost" onClick={handleRemoveLogo} style={{ color: 'var(--color-error)' }}>
              🗑️ Hapus Logo
            </button>
          )}
        </div>
        <p style={{ fontSize: 12, color: 'var(--color-muted-soft)', marginTop: 6 }}>
          PNG, SVG, JPG, WebP. Ukuran px. Akan tampil di sidebar dan halaman login.
        </p>
      </div>

      {/* Favicon Upload */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--color-body)', marginBottom: 8 }}>
          Favicon (Icon Tab Browser)
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            ref={faviconInputRef}
            type="file"
            accept={ACCEPT_IMAGE}
            onChange={handleFaviconUpload}
            style={{ display: 'none' }}
          />
          <button className="btn btn-secondary" onClick={() => faviconInputRef.current?.click()}>
            📁 Upload Favicon
          </button>
          {brand.faviconUrl && (
            <button className="btn btn-ghost" onClick={handleRemoveFavicon} style={{ color: 'var(--color-error)' }}>
              🗑️ Hapus Favicon
            </button>
          )}
        </div>
        {brand.faviconUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <img src={brand.faviconUrl} alt="favicon preview" style={{ width: 24, height: 24, borderRadius: 4 }} />
            <span style={{ fontSize: 13, color: 'var(--color-body)' }}>Favicon aktif</span>
          </div>
        )}
        <p style={{ fontSize: 12, color: 'var(--color-muted-soft)', marginTop: 6 }}>
          PNG, SVG, ICO. Ukuran 32×32 px ideal untuk browser tab.
        </p>
      </div>

      {/* Nama Brand */}
      <div className="form-group" style={{ marginBottom: 24 }}>
        <label>Nama Brand</label>
        <input
          type="text"
          value={brand.name}
          onChange={(e) => updateBrand({ name: e.target.value })}
          placeholder="DashDNS"
          maxLength={30}
          style={{ width: 300 }}
        />
        <p style={{ fontSize: 12, color: 'var(--color-muted-soft)', marginTop: 4 }}>
          Tampil di sidebar, halaman login, dan title tab browser.
        </p>
      </div>

      {/* Color Picker */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--color-body)', marginBottom: 8 }}>
          Accent Color
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PRESET_COLORS.map(color => (
            <button
              key={color}
              onClick={() => handleSaveColor(color)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-md)',
                background: color,
                cursor: 'pointer',
                border: customColor === color ? '2px solid var(--color-ink)' : '2px solid transparent',
                transition: 'all 0.12s ease',
                outline: customColor === color ? '2px solid var(--color-body-strong)' : 'none',
                outlineOffset: 1
              }}
            />
          ))}
        </div>
        <div className="form-group" style={{ marginTop: 12 }}>
          <label>Custom Color (hex)</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              placeholder="#0007cd"
              maxLength={7}
              style={{ width: 160, fontFamily: 'var(--font-mono)' }}
            />
            <input
              type="color"
              value={customColor}
              onChange={(e) => handleSaveColor(e.target.value)}
              style={{ width: 44, height: 44, padding: 0, border: '1px solid var(--color-hairline)', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: 'none' }}
            />
            <button className="btn btn-primary" onClick={() => handleSaveColor(customColor)}>
              Apply
            </button>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--color-hairline)', paddingTop: 16 }}>
        <button className="btn btn-ghost" onClick={handleReset} style={{ color: 'var(--color-error)' }}>
          ⏪ Reset ke Default
        </button>
      </div>
    </div>
  )
}
