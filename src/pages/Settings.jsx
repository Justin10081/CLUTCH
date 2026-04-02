import { useState } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const ease = [0.16, 1, 0.3, 1]

const ACCENT_COLORS = [
  { name: 'Blue',    value: '#3b82f6' },
  { name: 'Cyan',    value: '#06b6d4' },
  { name: 'Violet',  value: '#8b5cf6' },
  { name: 'Pink',    value: '#ec4899' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Amber',   value: '#f59e0b' },
  { name: 'Rose',    value: '#f43f5e' },
  { name: 'Orange',  value: '#f97316' },
]

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 800, letterSpacing: '0.28em',
      textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)',
      marginBottom: 16,
    }}>
      {children}
    </div>
  )
}

function SettingsCard({ children, style }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16,
      padding: '24px',
      marginBottom: 16,
      ...style,
    }}>
      {children}
    </div>
  )
}

export default function Settings() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem('clutch-display-name') || ''
  )
  const [accentColor, setAccentColor] = useState(
    () => localStorage.getItem('clutch-accent') || '#3b82f6'
  )
  const [saved, setSaved] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)

  const handleSave = () => {
    localStorage.setItem('clutch-display-name', displayName)
    localStorage.setItem('clutch-accent', accentColor)
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleClearData = () => {
    if (clearConfirm) {
      const keysToKeep = ['sb-access-token', 'sb-refresh-token']
      const toDelete = Object.keys(localStorage).filter(k => !keysToKeep.some(kk => k.includes(kk)))
      toDelete.forEach(k => localStorage.removeItem(k))
      setClearConfirm(false)
      window.location.reload()
    } else {
      setClearConfirm(true)
      setTimeout(() => setClearConfirm(false), 4000)
    }
  }

  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      courses: JSON.parse(localStorage.getItem('clutch-courses') || '[]'),
      deadlines: JSON.parse(localStorage.getItem('clutch-deadlines') || '[]'),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clutch-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ minHeight: '100vh', padding: '0 0 100px 0' }}>

      {/* ── HERO ── */}
      <div style={{ padding: '48px 48px 40px', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 220,
          background: 'radial-gradient(ellipse at 20% 0%, rgba(59,130,246,0.07) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          style={{ position: 'relative' }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginBottom: 12 }}>
            SCENE 06 — SETTINGS
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 1.0, color: 'white', margin: 0 }}>
            Preferences.
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 10, fontWeight: 500 }}>
            Customize your Clutch experience.
          </p>
        </motion.div>
      </div>

      {/* ── CONTENT ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease }}
        style={{ padding: '0 48px', maxWidth: 680 }}>

        {/* ── ACCOUNT ── */}
        <SectionLabel>Account</SectionLabel>
        <SettingsCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}99)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 900, color: 'white',
              flexShrink: 0,
            }}>
              {(displayName || user?.email || 'C')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'white', marginBottom: 2 }}>
                {displayName || 'Clutch Student'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                {user?.email || 'demo@clutch.app'}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 8 }}>
              Display Name
            </div>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name..."
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                color: 'white', padding: '11px 14px', fontSize: 13,
                fontWeight: 500, outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = `${accentColor}60` }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)' }}
            />
          </div>
        </SettingsCard>

        {/* ── APPEARANCE ── */}
        <SectionLabel>Appearance</SectionLabel>
        <SettingsCard>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 16 }}>
            Accent Color
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {ACCENT_COLORS.map(c => (
              <motion.button
                key={c.value}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => setAccentColor(c.value)}
                title={c.name}
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: c.value,
                  border: accentColor === c.value
                    ? `3px solid white`
                    : '3px solid transparent',
                  cursor: 'none',
                  boxShadow: accentColor === c.value ? `0 0 16px ${c.value}80` : 'none',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                  position: 'relative',
                }}>
                {accentColor === c.value && (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, color: 'white',
                  }}>✓</div>
                )}
              </motion.button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 14 }}>
            Accent color is saved as your preference. Some UI elements use the selected color.
          </p>
        </SettingsCard>

        {/* ── DATA MANAGEMENT ── */}
        <SectionLabel>Data Management</SectionLabel>
        <SettingsCard>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Export */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 2 }}>Export Data</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Download your courses and deadlines as JSON</div>
              </div>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleExport}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, padding: '9px 18px',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)',
                  cursor: 'none', flexShrink: 0,
                }}>
                Export
              </motion.button>
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

            {/* Clear */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 2 }}>Clear Local Data</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                  {clearConfirm ? 'Click again to confirm — this cannot be undone' : 'Removes cached courses and deadlines from this device'}
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleClearData}
                style={{
                  background: clearConfirm ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.07)',
                  border: `1px solid ${clearConfirm ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.18)'}`,
                  borderRadius: 10, padding: '9px 18px',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: '#f87171',
                  cursor: 'none', flexShrink: 0,
                  transition: 'all 0.2s',
                }}>
                {clearConfirm ? 'Confirm' : 'Clear'}
              </motion.button>
            </div>
          </div>
        </SettingsCard>

        {/* ── SESSION ── */}
        <SectionLabel>Session</SectionLabel>
        <SettingsCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 2 }}>Sign Out</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                {user?.email || 'demo@clutch.app'}
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleSignOut}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, padding: '9px 18px',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)',
                cursor: 'none',
              }}>
              Sign Out
            </motion.button>
          </div>
        </SettingsCard>

        {/* ── ABOUT ── */}
        <SectionLabel>About</SectionLabel>
        <SettingsCard>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['App', 'CLUTCH'],
              ['Version', '2.0.0'],
              ['Stack', 'React · Supabase · Groq AI · Vercel'],
              ['AI Model', 'Llama 3.3 70B Versatile'],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>{val}</span>
              </div>
            ))}
          </div>
        </SettingsCard>

        {/* ── SAVE ── */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          style={{
            width: '100%', padding: '16px 0', borderRadius: 14,
            fontSize: 12, fontWeight: 800, letterSpacing: '0.18em',
            textTransform: 'uppercase',
            background: saved
              ? 'linear-gradient(135deg, #10b981, #06b6d4)'
              : `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
            color: 'white', border: 'none', cursor: 'none',
            boxShadow: `0 0 30px ${accentColor}40`,
            transition: 'background 0.3s, box-shadow 0.3s',
          }}>
          {saved ? '✓ Saved' : 'Save Preferences'}
        </motion.button>

      </motion.div>
    </div>
  )
}
