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
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b px-4 py-3 flex items-center justify-between backdrop-blur-md" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 80%, transparent)', borderColor: 'var(--border-color)' }}>
        <NavLink to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Clutch</span>
        </NavLink>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <button onClick={signOut} className="text-sm px-3 py-1.5 rounded-lg" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-input)' }}>
            Sign out
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 border-t flex justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 90%, transparent)', borderColor: 'var(--border-color)' }}>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className="flex flex-col items-center gap-0.5 px-3 py-1">
            {({ isActive }) => (
              <>
                <Icon active={isActive} />
                <span className="text-[10px] font-medium" style={{ color: isActive ? 'var(--color-accent-500)' : 'var(--text-muted)' }}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function HomeIcon({ active }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={active ? 'var(--color-accent-500)' : 'var(--text-muted)'} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
    </svg>
  )
}

function ZapIcon({ active }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={active ? 'var(--color-accent-500)' : 'var(--text-muted)'} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )
}

function ChartIcon({ active }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={active ? 'var(--color-accent-500)' : 'var(--text-muted)'} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function ClockIcon({ active }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={active ? 'var(--color-accent-500)' : 'var(--text-muted)'} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  )
}
