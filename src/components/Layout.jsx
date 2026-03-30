import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const navItems = [
  { to: '/dashboard', label: 'Home', icon: HomeIcon },
  { to: '/clutch', label: 'Clutch', icon: ZapIcon },
  { to: '/gpa', label: 'GPA', icon: ChartIcon },
  { to: '/deadlines', label: 'Deadlines', icon: ClockIcon },
]

export default function Layout() {
  const { signOut, user } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Top header */}
      <header className="sticky top-0 z-50 glass-nav border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center glow-accent-sm transition-all duration-300 group-hover:scale-110"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
              <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-extrabold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>CLUTCH</span>
          </NavLink>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className="group">
                {({ isActive }) => (
                  <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                    style={{
                      backgroundColor: isActive ? 'var(--glow-color-soft)' : 'transparent',
                      color: isActive ? 'var(--color-accent-400)' : 'var(--text-muted)',
                    }}>
                    <Icon active={isActive} />
                    {label}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={toggleTheme}
              className="p-2 rounded-lg transition-all duration-200 hover:bg-[var(--bg-input)]"
              style={{ color: 'var(--text-muted)' }}>
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <button onClick={signOut}
              className="hidden sm:flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg font-medium transition-all duration-200 hover:bg-[var(--bg-input)]"
              style={{ color: 'var(--text-muted)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Bottom nav — mobile only */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 glass-nav border-t z-50"
        style={{ borderColor: 'var(--border-color)', paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        <div className="flex justify-around py-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className="flex flex-col items-center gap-0.5 px-4 py-1 relative">
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                      style={{ background: 'linear-gradient(90deg, #7c3aed, #a78bfa)' }} />
                  )}
                  <Icon active={isActive} />
                  <span className="text-[10px] font-semibold transition-colors duration-200"
                    style={{ color: isActive ? 'var(--color-accent-400)' : 'var(--text-muted)' }}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

function HomeIcon({ active }) {
  return (
    <svg className="w-5 h-5 transition-transform duration-200" style={{ color: active ? 'var(--color-accent-400)' : 'var(--text-muted)', transform: active ? 'scale(1.1)' : 'scale(1)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
    </svg>
  )
}

function ZapIcon({ active }) {
  return (
    <svg className="w-5 h-5 transition-transform duration-200" style={{ color: active ? 'var(--color-accent-400)' : 'var(--text-muted)', transform: active ? 'scale(1.1)' : 'scale(1)' }} fill={active ? 'var(--color-accent-400)' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )
}

function ChartIcon({ active }) {
  return (
    <svg className="w-5 h-5 transition-transform duration-200" style={{ color: active ? 'var(--color-accent-400)' : 'var(--text-muted)', transform: active ? 'scale(1.1)' : 'scale(1)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function ClockIcon({ active }) {
  return (
    <svg className="w-5 h-5 transition-transform duration-200" style={{ color: active ? 'var(--color-accent-400)' : 'var(--text-muted)', transform: active ? 'scale(1.1)' : 'scale(1)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  )
}
