import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/courses')
    }
  }

  const inputStyle = (field, hasError) => ({
    width: '100%',
    padding: '14px 16px',
    background: hasError ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.05)',
    border: hasError
      ? '1px solid rgba(239,68,68,0.5)'
      : focusedField === field
      ? '1px solid #3b82f6'
      : '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: 'white',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
    boxShadow: hasError
      ? '0 0 0 3px rgba(239,68,68,0.12)'
      : focusedField === field
      ? '0 0 0 3px rgba(59,130,246,0.15)'
      : 'none',
  })

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#080a0e',
      color: 'white',
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
    }}>
      {/* Dot grid background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        zIndex: 0,
      }} />

      {/* Ambient glow */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 700,
        height: 700,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, rgba(6,182,212,0.06) 40%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Film grain */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'repeat',
        backgroundSize: '180px 180px',
        opacity: 0.032,
      }} />

      {/* CLUTCH logo — top left */}
      <div style={{
        position: 'fixed',
        top: 28,
        left: 36,
        zIndex: 20,
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={{
            fontWeight: 900,
            fontSize: 18,
            letterSpacing: '-0.04em',
            color: 'white',
          }}>CLUTCH</span>
        </Link>
      </div>

      {/* Main layout */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        width: '100%',
        minHeight: '100vh',
      }}>

        {/* LEFT PANEL — desktop only */}
        <div style={{
          display: 'none',
          flex: '0 0 55%',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px 64px',
          position: 'relative',
          // shown via media query trick using inline style override
        }}
          className="login-left-panel">
          <div style={{ marginBottom: 12 }}>
            <div style={{
              fontSize: 'clamp(64px, 8vw, 110px)',
              fontWeight: 900,
              lineHeight: 0.88,
              letterSpacing: '-0.05em',
              color: 'white',
              display: 'block',
            }}>
              WELCOME
            </div>
            <div style={{
              fontSize: 'clamp(64px, 8vw, 110px)',
              fontWeight: 900,
              lineHeight: 0.88,
              letterSpacing: '-0.05em',
              WebkitTextStroke: '2px rgba(255,255,255,0.15)',
              color: 'transparent',
              display: 'block',
              marginLeft: 4,
            }}>
              BACK.
            </div>
          </div>

          <div style={{ marginTop: 48 }}>
            <div style={{
              fontSize: 'clamp(16px, 1.8vw, 22px)',
              fontWeight: 800,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.22)',
              lineHeight: 1.5,
            }}>
              YOUR SEMESTER
            </div>
            <div style={{
              fontSize: 'clamp(16px, 1.8vw, 22px)',
              fontWeight: 800,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.22)',
            }}>
              AWAITS.
            </div>
          </div>

          {/* Decorative vertical line */}
          <div style={{
            position: 'absolute',
            right: 0,
            top: '10%',
            bottom: '10%',
            width: 1,
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.06) 70%, transparent)',
          }} />
        </div>

        {/* RIGHT PANEL — form */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '100px 32px 60px',
          minHeight: '100vh',
        }}>
          <div style={{ width: '100%', maxWidth: 380 }}>

            {/* SIGN IN label */}
            <div style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.3)',
              marginBottom: 16,
            }}>SIGN IN</div>

            {/* Divider */}
            <div style={{
              height: 1,
              background: 'linear-gradient(to right, rgba(59,130,246,0.5), rgba(6,182,212,0.3), transparent)',
              marginBottom: 36,
            }} />

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '12px 16px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 8,
                marginBottom: 24,
                color: '#f87171',
                fontSize: 13,
              }}>
                <svg width="15" height="15" style={{ flexShrink: 0, marginTop: 1 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Email */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.35)',
                  marginBottom: 8,
                }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  required
                  placeholder="you@university.edu"
                  autoComplete="email"
                  style={inputStyle('email', false)}
                />
              </div>

              {/* Password */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.35)',
                  marginBottom: 8,
                }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    required
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    style={{ ...inputStyle('password', !!error), paddingRight: 48 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      position: 'absolute',
                      right: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.3)',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                    }}>
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !email || !password}
                style={{
                  marginTop: 8,
                  padding: '15px 24px',
                  background: loading || !email || !password
                    ? 'rgba(59,130,246,0.3)'
                    : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
                  boxShadow: loading || !email || !password
                    ? 'none'
                    : '0 0 28px rgba(59,130,246,0.35)',
                  transition: 'opacity 0.2s, box-shadow 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}>
                {loading ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.7s linear infinite' }}>
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Signing in...
                  </>
                ) : 'ENTER →'}
              </button>
            </form>

            {/* Footer links */}
            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.25)',
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: 0,
                }}>
                Forgot password?
              </button>
              <Link
                to="/signup"
                style={{
                  color: 'rgba(255,255,255,0.45)',
                  fontSize: 13,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                New here?{' '}
                <span style={{ color: '#3b82f6', fontWeight: 700 }}>Create account →</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive styles via <style> injection */}
      <style>{`
        @media (min-width: 768px) {
          .login-left-panel {
            display: flex !important;
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input::placeholder {
          color: rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  )
}

function EyeIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}
