import { useState, useEffect, useRef, useCallback } from 'react'

const WORK_DURATION = 25 * 60   // 25 minutes in seconds
const BREAK_DURATION = 5 * 60   // 5 minutes in seconds

// Circumference of the circle (r=44)
const RADIUS = 44
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function StudyTimer() {
  const [panelOpen, setPanelOpen] = useState(false)
  const [active, setActive] = useState(false)
  const [paused, setPaused] = useState(false)
  const [phase, setPhase] = useState('work')       // 'work' | 'break'
  const [timeLeft, setTimeLeft] = useState(WORK_DURATION)
  const [sessionCount, setSessionCount] = useState(0)
  const [flashing, setFlashing] = useState(false)
  const [tickKey, setTickKey] = useState(0)
  const intervalRef = useRef(null)

  const totalDuration = phase === 'work' ? WORK_DURATION : BREAK_DURATION
  const progress = (totalDuration - timeLeft) / totalDuration
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress)

  const triggerFlash = useCallback(() => {
    setFlashing(true)
    setTimeout(() => setFlashing(false), 800)
  }, [])

  const switchPhase = useCallback(() => {
    triggerFlash()
    setPhase(prev => {
      if (prev === 'work') {
        setSessionCount(c => c + 1)
        setTimeLeft(BREAK_DURATION)
        return 'break'
      } else {
        setTimeLeft(WORK_DURATION)
        return 'work'
      }
    })
  }, [triggerFlash])

  // Timer tick
  useEffect(() => {
    if (active && !paused) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current)
            switchPhase()
            setTickKey(k => k + 1)
            return 0
          }
          return t - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [active, paused, tickKey, switchPhase])

  const handlePlay = () => {
    if (!active) {
      setActive(true)
      setPaused(false)
    } else {
      setPaused(v => !v)
    }
  }

  const handleReset = () => {
    clearInterval(intervalRef.current)
    setActive(false)
    setPaused(false)
    setPhase('work')
    setTimeLeft(WORK_DURATION)
    setSessionCount(0)
  }

  const handleSkip = () => {
    clearInterval(intervalRef.current)
    switchPhase()
    if (active && !paused) setTickKey(k => k + 1)
  }

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const isRunning = active && !paused
  const ringColor = phase === 'work' ? '#3b82f6' : '#06b6d4'
  const phaseLabelColor = phase === 'work' ? '#3b82f6' : '#06b6d4'

  return (
    <>
      {/* ── Timer icon button (rendered in header via portal-free approach) ── */}
      {/* This component renders both the trigger button and the panel.
          The trigger is a fixed-position element near the top right (before hamburger). */}
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>

        {/* Timer button */}
        <button
          onClick={() => setPanelOpen(v => !v)}
          title="Pomodoro Timer"
          style={{
            background: panelOpen ? 'rgba(59,130,246,0.15)' : 'none',
            border: panelOpen ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
            borderRadius: 8,
            color: panelOpen ? '#3b82f6' : 'rgba(255,255,255,0.4)',
            cursor: 'none',
            padding: '6px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            transition: 'background 0.2s, border-color 0.2s, color 0.2s',
          }}>
          {/* Timer SVG icon */}
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="13" r="8" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4l2.5 2.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 3h5M12 3v2" />
          </svg>

          {/* Pulsing dot when active and panel is closed */}
          {isRunning && !panelOpen && (
            <span style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: phase === 'work' ? '#3b82f6' : '#06b6d4',
              boxShadow: `0 0 8px ${phase === 'work' ? 'rgba(59,130,246,0.8)' : 'rgba(6,182,212,0.8)'}`,
              animation: 'timerPulse 1.4s ease-in-out infinite',
            }} />
          )}
        </button>
      </div>

      {/* ── Floating panel ── */}
      {panelOpen && (
        <div style={{
          position: 'fixed',
          bottom: 80,
          right: 24,
          zIndex: 500,
          width: 280,
          background: '#0d0f18',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.08)',
          overflow: 'hidden',
          animation: 'timerSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}>

          {/* Flash overlay */}
          {flashing && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(circle, ${ringColor}33 0%, transparent 70%)`,
              animation: 'timerFlash 0.8s ease-out forwards',
              pointerEvents: 'none',
              zIndex: 10,
            }} />
          )}

          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 18px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
                Pomodoro
              </div>
              {sessionCount > 0 && (
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>
                  SESSION {sessionCount}
                </div>
              )}
            </div>
            <button
              onClick={() => setPanelOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.25)',
                cursor: 'none',
                padding: '4px 6px',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
              }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '24px 18px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            {/* Phase label */}
            <div style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: phaseLabelColor,
              marginBottom: 20,
            }}>
              {phase === 'work' ? '● Work' : '● Break'}
            </div>

            {/* SVG circular progress ring */}
            <div style={{ position: 'relative', width: 140, height: 140, marginBottom: 24 }}>
              <svg width="140" height="140" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                {/* Track */}
                <circle
                  cx="50" cy="50" r={RADIUS}
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="4"
                />
                {/* Progress ring */}
                <circle
                  cx="50" cy="50" r={RADIUS}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${CIRCUMFERENCE}`}
                  strokeDashoffset={strokeDashoffset}
                  style={{
                    transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease',
                    filter: `drop-shadow(0 0 6px ${ringColor}aa)`,
                  }}
                />
              </svg>
              {/* Time display */}
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  fontSize: 32,
                  fontWeight: 900,
                  letterSpacing: '-0.04em',
                  color: 'white',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                }}>
                  {formatTime(timeLeft)}
                </div>
                {sessionCount > 0 && (
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 4, letterSpacing: '0.1em' }}>
                    #{sessionCount}
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

              {/* Reset */}
              <button
                onClick={handleReset}
                title="Reset"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.35)',
                  cursor: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

              {/* Play / Pause — main button */}
              <button
                onClick={handlePlay}
                title={isRunning ? 'Pause' : 'Start'}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${ringColor}, ${phase === 'work' ? '#06b6d4' : '#3b82f6'})`,
                  border: 'none',
                  color: 'white',
                  cursor: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 24px ${ringColor}55`,
                  transition: 'box-shadow 0.3s',
                }}>
                {isRunning ? (
                  /* Pause icon */
                  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  /* Play icon */
                  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5.14v14l11-7-11-7z" />
                  </svg>
                )}
              </button>

              {/* Skip */}
              <button
                onClick={handleSkip}
                title="Skip to next phase"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.35)',
                  cursor: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Phase info footer */}
            <div style={{
              marginTop: 18,
              display: 'flex',
              gap: 12,
              width: '100%',
            }}>
              <div style={{
                flex: 1,
                padding: '8px 12px',
                background: phase === 'work' ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${phase === 'work' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)'}`,
                borderRadius: 8,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: phase === 'work' ? '#3b82f6' : 'rgba(255,255,255,0.2)' }}>25</div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>Work</div>
              </div>
              <div style={{
                flex: 1,
                padding: '8px 12px',
                background: phase === 'break' ? 'rgba(6,182,212,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${phase === 'break' ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.05)'}`,
                borderRadius: 8,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: phase === 'break' ? '#06b6d4' : 'rgba(255,255,255,0.2)' }}>5</div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>Break</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes timerPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.75); }
        }
        @keyframes timerSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes timerFlash {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </>
  )
}
