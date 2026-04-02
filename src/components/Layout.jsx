import { useState, useEffect, useRef } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '../context/AuthContext'
import StudyTimer from './StudyTimer'

const PAGE_MAP = {
  '/courses': 'Course Hub',
  '/clutch': 'Clutch Mode',
  '/gpa': 'GPA Simulator',
  '/deadlines': 'TO-DO',
  '/social': 'Ranked',
  '/dashboard': 'Overview',
  '/settings': 'Settings',
  '/admin': 'Admin',
}

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', sub: 'Your home base' },
  { to: '/courses', label: 'Courses', sub: 'Your semester hub' },
  { to: '/clutch', label: 'Clutch Mode', sub: 'AI study engine' },
  { to: '/gpa', label: 'GPA Simulator', sub: 'What do you need?' },
  { to: '/deadlines', label: 'TO-DO', sub: 'Stay on track' },
  { to: '/social', label: 'Ranked', sub: 'Leaderboard & friends' },
]

const BOTTOM_TABS = [
  {
    to: '/dashboard',
    label: 'Home',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" />
        <path d="M9 21V12h6v9" strokeWidth="1.8" fill="none" />
      </svg>
    ),
  },
  {
    to: '/courses',
    label: 'Courses',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>
    ),
  },
  {
    to: '/clutch',
    label: 'Clutch',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L4.09 12.26c-.21.27-.32.59-.31.92.01.32.14.63.36.86L13 22l8.86-8.96c.22-.23.35-.54.36-.86a1.4 1.4 0 00-.31-.92L13 2z" />
      </svg>
    ),
  },
  {
    to: '/deadlines',
    label: 'TO-DO',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    to: '/gpa',
    label: 'GPA',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
    ),
  },
]

// Zero-lag crosshair — pure DOM, no React/spring overhead
function CustomCursor() {
  const ref = useRef(null)

  useEffect(() => {
    // Hide default cursor only while the app shell is mounted
    document.body.style.cursor = 'none'
    const style = document.createElement('style')
    style.id = 'clutch-cursor-hide'
    style.textContent = '* { cursor: none !important; }'
    document.head.appendChild(style)

    const h = e => {
      if (ref.current) {
        ref.current.style.transform = `translate(${e.clientX - 14}px,${e.clientY - 14}px)`
      }
    }
    window.addEventListener('mousemove', h, { passive: true })

    return () => {
      document.body.style.cursor = ''
      document.getElementById('clutch-cursor-hide')?.remove()
      window.removeEventListener('mousemove', h)
    }
  }, [])

  const line = { position: 'absolute', background: 'rgba(255,255,255,0.65)', borderRadius: 1 }

  return (
    <div ref={ref} style={{
      position: 'fixed', top: 0, left: 0, zIndex: 9999,
      pointerEvents: 'none', width: 28, height: 28,
      willChange: 'transform', transform: 'translate(-200px,-200px)',
    }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', width: 3, height: 3, borderRadius: '50%', background: 'white', transform: 'translate(-50%,-50%)' }} />
      <div style={{ ...line, width: 1, height: 7, top: 1, left: '50%', transform: 'translateX(-50%)' }} />
      <div style={{ ...line, width: 1, height: 7, bottom: 1, left: '50%', transform: 'translateX(-50%)' }} />
      <div style={{ ...line, height: 1, width: 7, left: 1, top: '50%', transform: 'translateY(-50%)' }} />
      <div style={{ ...line, height: 1, width: 7, right: 1, top: '50%', transform: 'translateY(-50%)' }} />
    </div>
  )
}

// Ambient floating particles — kept lean (8 max, GPU-composited only)
function Particles() {
  const pts = useRef(
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      left: (i / 8) * 100 + Math.random() * 10,
      size: Math.random() * 2 + 1,
      dur: Math.random() * 20 + 18,
      delay: Math.random() * -28,
      blue: i % 2 === 0,
      opacity: Math.random() * 0.25 + 0.06,
    }))
  ).current

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 2 }}>
      {pts.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.left}%`,
          bottom: -8,
          width: p.size,
          height: p.size,
          borderRadius: '50%',
          willChange: 'transform',
          backgroundColor: p.blue ? `rgba(59,130,246,${p.opacity})` : `rgba(6,182,212,${p.opacity})`,
          animation: `clutch-float ${p.dur}s ${p.delay}s linear infinite`,
        }} />
      ))}
    </div>
  )
}

// ── Bottom Navigation Bar ──────────────────────────────────────────────────────
function BottomNav({ pathname }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'rgba(8,10,14,0.92)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'stretch',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {BOTTOM_TABS.map(tab => {
        const active = pathname === tab.to || (tab.to !== '/dashboard' && pathname.startsWith(tab.to))
        return (
          <Link
            key={tab.to}
            to={tab.to}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 4, padding: '10px 4px 10px',
              textDecoration: 'none', position: 'relative',
              color: active ? '#3b82f6' : 'rgba(255,255,255,0.32)',
              transition: 'color 0.2s',
            }}>
            {active && (
              <motion.div
                layoutId="bottomNavIndicator"
                style={{
                  position: 'absolute', top: 0, left: '20%', right: '20%', height: 2,
                  background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                  borderRadius: '0 0 4px 4px',
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <motion.div
              animate={{ scale: active ? 1.1 : 1, y: active ? -1 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
              {tab.icon(active)}
            </motion.div>
            <span style={{
              fontSize: 9, fontWeight: active ? 800 : 600,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              lineHeight: 1,
            }}>
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const pageName = PAGE_MAP[location.pathname] || 'CLUTCH'

  useEffect(() => setMenuOpen(false), [location.pathname])
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const handleSignOut = async () => {
    setMenuOpen(false)
    await signOut()
    navigate('/login')
  }

  const headerBg = menuOpen ? 'transparent' : 'rgba(8,10,14,0.75)'
  const headerBorder = menuOpen ? 'none' : '1px solid rgba(255,255,255,0.05)'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#080a0e', color: 'white', position: 'relative', cursor: 'none' }}>
      <CustomCursor />
      <Particles />

      {/* Film grain — static, no animation to avoid full-screen repaints */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'repeat', backgroundSize: '200px 200px',
        opacity: 0.025,
      }} />

      {/* ── HEADER ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backdropFilter: menuOpen ? 'none' : 'blur(24px)',
        WebkitBackdropFilter: menuOpen ? 'none' : 'blur(24px)',
        background: headerBg, borderBottom: headerBorder,
        transition: 'background 0.4s, border 0.4s',
      }}>
        <Link to="/dashboard" style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-0.045em', color: menuOpen ? 'rgba(255,255,255,0.7)' : 'white', textDecoration: 'none', transition: 'color 0.3s', cursor: 'none' }}>
          CLUTCH
        </Link>

        <AnimatePresence mode="wait">
          {!menuOpen && (
            <motion.span key={pageName}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28 }}
              style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)' }}>
              {pageName}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Timer button rendered by StudyTimer component */}
        {!menuOpen && <StudyTimer />}

        <button
          onClick={() => setMenuOpen(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'none', padding: '6px', display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
          <motion.div animate={{ rotate: menuOpen ? 45 : 0, y: menuOpen ? 7 : 0, width: menuOpen ? 24 : 24 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: 24, height: 1.5, background: 'white', borderRadius: 2, transformOrigin: 'center', display: 'block' }} />
          <motion.div animate={{ opacity: menuOpen ? 0 : 1, scaleX: menuOpen ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            style={{ width: 16, height: 1.5, background: 'rgba(255,255,255,0.5)', borderRadius: 2, transformOrigin: 'right' }} />
          <motion.div animate={{ rotate: menuOpen ? -45 : 0, y: menuOpen ? -7 : 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: 24, height: 1.5, background: 'white', borderRadius: 2, transformOrigin: 'center', display: 'block' }} />
        </button>
      </header>

      {/* ── OVERLAY MENU ── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
            animate={{ opacity: 1, clipPath: 'inset(0 0 0% 0)' }}
            exit={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'fixed', inset: 0, zIndex: 150, backgroundColor: '#080a0e', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '100px 48px 48px', overflow: 'hidden' }}>

            {/* Background accent */}
            <div style={{ position: 'absolute', top: '40%', right: '10%', width: 500, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(59,130,246,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {NAV_ITEMS.map((item, i) => (
                <motion.div key={item.to}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.45, delay: i * 0.065, ease: [0.16, 1, 0.3, 1] }}>
                  <Link to={item.to}
                    style={{ display: 'block', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '22px 0', cursor: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
                      <span style={{
                        fontSize: 'clamp(36px, 5.5vw, 64px)', fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 1,
                        color: location.pathname === item.to ? 'white' : 'rgba(255,255,255,0.3)',
                        transition: 'color 0.2s',
                      }}>
                        {item.label}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.18)', whiteSpace: 'nowrap' }}>
                        {item.sub}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </nav>

            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>
                {user?.email || 'demo@clutch.app'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Settings gear icon */}
                <Link to="/settings"
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.14)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(255,255,255,0.38)', cursor: 'none',
                    textDecoration: 'none', transition: 'border-color 0.2s, color 0.2s',
                  }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </Link>
                <button onClick={handleSignOut}
                  style={{ background: 'none', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 999, padding: '8px 22px', fontSize: 10, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', cursor: 'none', transition: 'border-color 0.2s, color 0.2s' }}>
                  Sign Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN ── */}
      <main style={{ position: 'relative', zIndex: 10, minHeight: '100vh', paddingTop: '76px', paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}>
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── ELEMENT LABEL ── */}
      <AnimatePresence mode="wait">
        <motion.div key={pageName}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{ position: 'fixed', bottom: 'calc(76px + env(safe-area-inset-bottom))', left: 28, zIndex: 50, pointerEvents: 'none', userSelect: 'none' }}>
          <div style={{ fontSize: 8, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.12)', marginBottom: 3 }}>ELEMENT</div>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>{pageName}</div>
        </motion.div>
      </AnimatePresence>

      {/* ── BOTTOM NAV ── */}
      <BottomNav pathname={location.pathname} />
    </div>
  )
}
