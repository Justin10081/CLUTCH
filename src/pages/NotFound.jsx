import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function NotFound() {
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(10)

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(interval); navigate('/'); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [navigate])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center relative overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Background orb */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 animate-fade-up">
        {/* Glitch 404 */}
        <div className="relative mb-4 select-none">
          <div className="text-[120px] sm:text-[160px] font-black leading-none gradient-text" aria-hidden>404</div>
          <div className="text-[120px] sm:text-[160px] font-black leading-none absolute inset-0 opacity-30"
            style={{ color: 'var(--color-danger-400)', animation: 'glitch 3s steps(1) infinite', clipPath: 'inset(10% 0 80% 0)' }}
            aria-hidden>404</div>
          <div className="text-[120px] sm:text-[160px] font-black leading-none absolute inset-0 opacity-20"
            style={{ color: 'var(--color-accent-300)', animation: 'glitch 3s steps(1) infinite 0.5s', clipPath: 'inset(60% 0 10% 0)' }}
            aria-hidden>404</div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold mb-3" style={{ color: 'var(--text-primary)' }}>
          Page not found
        </h1>
        <p className="text-base max-w-sm mx-auto mb-8" style={{ color: 'var(--text-secondary)' }}>
          This page doesn't exist. Maybe it got overwhelmed during finals week too.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Link to="/" className="btn-glow px-6 py-3 text-sm">
            Go home
          </Link>
          <Link to="/dashboard" className="btn-ghost px-6 py-3 text-sm">
            Open app
          </Link>
        </div>

        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Redirecting to home in <span className="font-bold" style={{ color: 'var(--color-accent-400)' }}>{countdown}s</span>
        </p>
      </div>
    </div>
  )
}
