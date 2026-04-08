import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react'
import { useDeadlines } from '../context/DeadlinesContext'
import { useCourses } from '../context/CoursesContext'
import { useSessions } from '../context/SessionsContext'

const ease = [0.16, 1, 0.3, 1]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 5)  return { text: 'Still grinding', tag: 'LATE NIGHT',  accent: '#a78bfa', sub: '#7c3aed' }
  if (h < 12) return { text: 'Good morning',   tag: 'MORNING',     accent: '#fbbf24', sub: '#d97706' }
  if (h < 17) return { text: 'Good afternoon', tag: 'AFTERNOON',   accent: '#38bdf8', sub: '#0284c7' }
  if (h < 21) return { text: 'Good evening',   tag: 'EVENING',     accent: '#34d399', sub: '#059669' }
  return           { text: 'Night mode',       tag: 'NIGHT OWL',   accent: '#a78bfa', sub: '#7c3aed' }
}

function useCounter(target, duration = 1000) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (target === 0) { setVal(0); return }
    let start = 0
    const step = target / (duration / 16)
    const id = setInterval(() => {
      start += step
      if (start >= target) { setVal(target); clearInterval(id) }
      else setVal(Math.floor(start))
    }, 16)
    return () => clearInterval(id)
  }, [target, duration])
  return val
}

function getDangerScore(d) {
  if (d.completed) return 0
  const daysLeft = Math.max(0, (new Date(d.date) - new Date()) / 86400000)
  const u = daysLeft <= 0 ? 10 : daysLeft <= 1 ? 9 : daysLeft <= 2 ? 8 : daysLeft <= 3 ? 7 : daysLeft <= 5 ? 5 : daysLeft <= 7 ? 3 : daysLeft <= 14 ? 2 : 1
  return Math.round(((u * 3) + ((d.weight || 5) * 1.5) + (d.difficulty || 5)) / 5.5 * 10) / 10
}

function getTimeLeft(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  if (diff < 0) return { text: 'OVERDUE', color: '#ef4444', urgent: true }
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(hours / 24)
  if (hours < 24) return { text: `${hours}h left`, color: '#ef4444', urgent: true }
  if (days <= 2)  return { text: `${days}d left`, color: '#f87171', urgent: true }
  if (days <= 5)  return { text: `${days}d left`, color: '#fbbf24', urgent: false }
  return { text: `${days}d left`, color: 'rgba(255,255,255,0.3)', urgent: false }
}

// ── Dot grid SVG background ───────────────────────────────────────────────────
function DotGrid({ opacity = 0.3 }) {
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="dash-dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={`rgba(255,255,255,${opacity})`} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dash-dots)" />
    </svg>
  )
}

// ── Big stat block ─────────────────────────────────────────────────────────────
function BigStat({ value, label, color, icon, delay = 0, to, suffix = '' }) {
  const counted = useCounter(value)
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.55, delay, ease }}
      style={{
        position: 'relative', overflow: 'hidden',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20,
        padding: '20px 18px 18px',
        cursor: to ? 'pointer' : 'default',
        textDecoration: 'none', display: 'block',
      }}>
      {/* top accent line */}
      <div style={{ position: 'absolute', top: 0, left: 20, right: 20, height: 1, background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }} />
      {/* corner glow */}
      <div style={{ position: 'absolute', bottom: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: `radial-gradient(ellipse, ${color}25 0%, transparent 70%)`, pointerEvents: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>{label}</div>
        <div style={{ fontSize: 14, opacity: 0.6 }}>{icon}</div>
      </div>
      <div style={{ fontSize: 'clamp(32px, 5vw, 42px)', fontWeight: 900, letterSpacing: '-0.06em', color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {counted}{suffix}
      </div>
    </motion.div>
  )
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{inner}</Link> : inner
}

// ── Focus / Deadline card ──────────────────────────────────────────────────────
function FocusCard({ deadline }) {
  if (!deadline) return null
  const tl = getTimeLeft(deadline.date)
  const score = getDangerScore(deadline)
  const isUrgent = score >= 7

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.12, ease }}
      style={{
        position: 'relative', overflow: 'hidden',
        background: isUrgent
          ? 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(220,38,38,0.04) 100%)'
          : 'linear-gradient(135deg, rgba(56,189,248,0.07) 0%, rgba(59,130,246,0.03) 100%)',
        border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.18)' : 'rgba(56,189,248,0.14)'}`,
        borderRadius: 20, padding: '22px 22px 18px',
      }}>
      {/* top accent */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: isUrgent ? 'linear-gradient(90deg, #ef4444, #f87171, transparent)' : 'linear-gradient(90deg, #38bdf8, #3b82f6, transparent)' }} />

      {isUrgent && (
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          style={{ position: 'absolute', top: 22, right: 22, width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
      )}

      <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.26em', color: isUrgent ? '#f87171' : '#38bdf8', marginBottom: 10 }}>
        {isUrgent ? '⚡ URGENT — FOCUS NOW' : '🎯 TODAY\'S FOCUS'}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 'clamp(16px, 3vw, 20px)', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {deadline.title}
          </div>
          {deadline.course && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 6, background: `${deadline.courseColor || '#38bdf8'}15`, border: `1px solid ${deadline.courseColor || '#38bdf8'}28` }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: deadline.courseColor || '#38bdf8' }} />
              <span style={{ fontSize: 9, fontWeight: 800, color: deadline.courseColor || '#38bdf8', letterSpacing: '0.08em' }}>{deadline.course}</span>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 'clamp(18px, 3vw, 24px)', fontWeight: 900, color: tl?.color || '#38bdf8', letterSpacing: '-0.04em' }}>{tl?.text}</div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', marginTop: 2, fontWeight: 700, letterSpacing: '0.1em' }}>SCORE {score.toFixed(1)}</div>
        </div>
      </div>

      <Link to="/deadlines" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 14, fontSize: 10, fontWeight: 900, color: isUrgent ? '#f87171' : '#38bdf8', textDecoration: 'none', letterSpacing: '0.1em' }}>
        ALL DEADLINES
        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </motion.div>
  )
}

// ── Action row item ────────────────────────────────────────────────────────────
function ActionItem({ to, icon, label, desc, color, tag, delay = 0 }) {
  const [hov, setHov] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease }}>
      <Link
        to={to}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 16px',
          background: hov ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${hov ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`,
          borderRadius: 16, textDecoration: 'none',
          transition: 'background 0.18s, border-color 0.18s',
          position: 'relative', overflow: 'hidden',
        }}>
        {/* left accent */}
        <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 2, borderRadius: 1, background: color, opacity: hov ? 1 : 0, transition: 'opacity 0.2s' }} />
        <motion.div
          animate={{ rotate: hov ? -6 : 0, scale: hov ? 1.1 : 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          style={{ width: 42, height: 42, borderRadius: 13, background: `${color}18`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 18 }}>{icon}</span>
        </motion.div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.01em' }}>{label}</span>
            {tag && <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.14em', padding: '2px 6px', borderRadius: 4, background: `${color}18`, color, border: `1px solid ${color}28` }}>{tag}</span>}
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{desc}</p>
        </div>
        <motion.div animate={{ x: hov ? 3 : 0 }} transition={{ type: 'spring', stiffness: 400 }}>
          <svg style={{ color: `${color}60` }} width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </motion.div>
      </Link>
    </motion.div>
  )
}

// ── Course pill ────────────────────────────────────────────────────────────────
function CoursePill({ course, urgentCount, delay = 0 }) {
  const [hov, setHov] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.38, delay, ease }}>
      <Link
        to={`/courses/${course.id}`}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 11,
          padding: '11px 14px',
          background: hov ? `${course.color}0a` : 'transparent',
          borderRadius: 12, textDecoration: 'none',
          transition: 'background 0.15s',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${course.color}18`, border: `1px solid ${course.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: course.color, boxShadow: `0 0 6px ${course.color}80` }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
            {course.code} — {course.name}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>
            {course.credits} cr{course.professor ? ` · ${course.professor}` : ''}
          </div>
        </div>
        {urgentCount > 0 && (
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ fontSize: 9, fontWeight: 900, padding: '2px 8px', borderRadius: 5, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', letterSpacing: '0.08em' }}>
            {urgentCount} DUE
          </motion.div>
        )}
        <svg style={{ color: `${course.color}50`, flexShrink: 0 }} width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </motion.div>
  )
}

// ── New user onboarding ────────────────────────────────────────────────────────
function Onboarding() {
  const steps = [
    { n: '01', color: '#38bdf8', emoji: '📚', title: 'Add your courses', desc: 'Create a course for each class. Upload your syllabus and pull every assignment instantly.', to: '/courses', cta: 'Add Courses' },
    { n: '02', color: '#a78bfa', emoji: '⚡', title: 'Run Clutch Mode',   desc: 'Upload notes before any exam. Get an AI study guide in 60 seconds — superior to anything else.', to: '/clutch', cta: 'Try Clutch' },
    { n: '03', color: '#fbbf24', emoji: '🎯', title: 'Track deadlines',   desc: 'Add assignments and exams. Clutch ranks them by danger score so you always know what\'s next.', to: '/deadlines', cta: 'Open TO-DO' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease }}
      style={{ position: 'relative', overflow: 'hidden', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 24, padding: '28px 24px' }}>
      <DotGrid opacity={0.12} />
      <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(56,189,248,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.28em', color: '#38bdf8', marginBottom: 12 }}>[ GET STARTED ]</div>
        <h2 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, letterSpacing: '-0.04em', color: 'white', margin: '0 0 6px' }}>Welcome to Clutch.</h2>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '0 0 24px', lineHeight: 1.5 }}>Your AI-powered academic command center. 3 steps to get started.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {steps.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.1, ease }}
              style={{ display: 'flex', gap: 14, padding: '14px 16px', background: `${s.color}09`, borderRadius: 14, border: `1px solid ${s.color}1a`, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}12`, border: `1px solid ${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{s.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 8, fontWeight: 900, color: s.color, letterSpacing: '0.18em', fontVariantNumeric: 'tabular-nums' }}>{s.n}</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.88)', letterSpacing: '-0.01em' }}>{s.title}</span>
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '0 0 8px', lineHeight: 1.45 }}>{s.desc}</p>
                <Link to={s.to} style={{ fontSize: 10, fontWeight: 900, color: s.color, textDecoration: 'none', letterSpacing: '0.1em' }}>{s.cta} →</Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ── Section label ──────────────────────────────────────────────────────────────
function SectionLabel({ children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>{children}</div>
      {right}
    </div>
  )
}

// ── Activity sparkline ─────────────────────────────────────────────────────────
function Sparkline({ count }) {
  // generate fake-ish bars based on session count
  const bars = Array.from({ length: 7 }, (_, i) => {
    const base = Math.max(0, count - 7 + i + 1)
    return base > 0 ? 0.3 + (Math.sin(i * 1.3 + count) * 0.3 + 0.5) * 0.7 : 0.05
  })
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 24 }}>
      {bars.map((h, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: `${h * 100}%` }}
          transition={{ delay: 0.6 + i * 0.05, duration: 0.4, ease }}
          style={{ width: 4, borderRadius: 2, background: h > 0.4 ? '#a78bfa' : 'rgba(167,139,250,0.25)', flexShrink: 0 }} />
      ))}
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  const { deadlines } = useDeadlines()
  const { courses } = useCourses()
  const { sessionCount: clutchSessions } = useSessions()
  const navigate = useNavigate()
  const { text: greeting, tag: greetTag, accent, sub: accentSub } = getGreeting()

  const activeDeadlines = deadlines.filter(d => !d.completed && d.date && new Date(d.date) >= new Date())
  const urgentDeadlines = activeDeadlines.filter(d => getDangerScore(d) >= 7)
  const topDeadline = [...activeDeadlines].sort((a, b) => getDangerScore(b) - getDangerScore(a))[0]
  const isNewUser = courses.length === 0

  const urgentByCourse = {}
  urgentDeadlines.forEach(d => {
    if (d.courseId) urgentByCourse[d.courseId] = (urgentByCourse[d.courseId] || 0) + 1
  })

  const firstName = user?.email
    ? (user.email.split('@')[0].split(/[._-]/)[0].charAt(0).toUpperCase() +
       user.email.split('@')[0].split(/[._-]/)[0].slice(1).toLowerCase())
    : null

  return (
    <div style={{ paddingBottom: 40 }}>
      <style>{`
        @keyframes db-scanline {
          0% { transform: translateY(-100%) }
          100% { transform: translateY(400%) }
        }
        @keyframes db-pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1) }
          50% { opacity: 0.4; transform: scale(0.7) }
        }
      `}</style>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
        style={{
          position: 'relative', overflow: 'hidden',
          borderRadius: 24, marginBottom: 16,
          padding: 'clamp(24px, 5vw, 36px) clamp(22px, 5vw, 32px) clamp(22px, 4vw, 30px)',
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>

        {/* dot grid */}
        <DotGrid opacity={0.18} />

        {/* ambient glows */}
        <div style={{ position: 'absolute', top: -50, right: -50, width: 260, height: 260, borderRadius: '50%', background: `radial-gradient(ellipse, ${accent}20 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: '20%', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(167,139,250,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* scan line animation */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: 24 }}>
          <div style={{ position: 'absolute', left: 0, right: 0, height: '40%', background: `linear-gradient(180deg, transparent, ${accent}06, transparent)`, animation: 'db-scanline 6s linear infinite' }} />
        </div>

        {/* top bar */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent, animation: 'db-pulse-dot 2s ease-in-out infinite' }} />
            <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.28em', textTransform: 'uppercase', color: accent }}>[ {greetTag} ]</span>
          </div>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.18)' }}>
            CLUTCH — HOME
          </div>
        </div>

        {/* greeting */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.55, ease }}
          style={{ position: 'relative' }}>
          <h1 style={{
            fontSize: 'clamp(30px, 6.5vw, 52px)',
            fontWeight: 900,
            letterSpacing: '-0.05em',
            color: 'white',
            margin: '0 0 6px',
            lineHeight: 1.05,
          }}>
            {greeting}
            {firstName && <span style={{ color: accent }}>{', '}{firstName}.</span>}
            {!firstName && <span style={{ color: accent }}>.</span>}
          </h1>

          <p style={{ fontSize: 'clamp(11px, 2vw, 13px)', color: 'rgba(255,255,255,0.32)', margin: 0, fontWeight: 500 }}>
            {isNewUser
              ? "Set up your semester and start dominating."
              : urgentDeadlines.length > 0
                ? `${urgentDeadlines.length} urgent deadline${urgentDeadlines.length > 1 ? 's' : ''} need your attention.`
                : courses.length > 0
                  ? `${courses.length} course${courses.length > 1 ? 's' : ''} active · ${clutchSessions} Clutch session${clutchSessions !== 1 ? 's' : ''} completed.`
                  : "You're all caught up. Keep it up."
            }
          </p>
        </motion.div>

        {/* bottom micro-row */}
        {!isNewUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, ease }}
            style={{ position: 'relative', marginTop: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Deadlines', val: activeDeadlines.length, color: activeDeadlines.length > 3 ? '#f87171' : '#34d399', to: '/deadlines' },
              { label: 'Courses',   val: courses.length,         color: accent,     to: '/courses' },
              { label: 'Sessions',  val: clutchSessions,          color: '#a78bfa',  to: '/clutch' },
            ].map((item, i) => (
              <Link key={i} to={item.to} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: item.color, letterSpacing: '-0.05em', fontVariantNumeric: 'tabular-nums' }}>{item.val}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{item.label}</span>
              </Link>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* ── NEW USER ── */}
      {isNewUser ? (
        <Onboarding />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── FOCUS CARD ── */}
          {topDeadline && <FocusCard deadline={topDeadline} />}

          {/* ── STATS GRID ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.18, ease }}>
            <SectionLabel>[ OVERVIEW ]</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <BigStat
                value={activeDeadlines.length}
                label="Active"
                icon="📅"
                color={activeDeadlines.length > 4 ? '#f87171' : activeDeadlines.length > 2 ? '#fbbf24' : '#34d399'}
                delay={0.2}
                to="/deadlines"
              />
              <BigStat value={courses.length}   label="Courses"  icon="📚" color={accent}    delay={0.25} to="/courses" />
              <BigStat value={clutchSessions}    label="Sessions" icon="⚡" color="#a78bfa"   delay={0.3}  to="/clutch" />
            </div>
          </motion.div>

          {/* ── URGENT BANNER ── */}
          {urgentDeadlines.length > 0 && !topDeadline && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, ease }}
              style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.16)', borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#f87171', letterSpacing: '-0.01em' }}>
                  {urgentDeadlines.length} deadline{urgentDeadlines.length > 1 ? 's' : ''} due within 48h
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                  {urgentDeadlines[0].title}{urgentDeadlines.length > 1 ? ` +${urgentDeadlines.length - 1} more` : ''}
                </div>
              </div>
              <Link to="/deadlines" style={{ fontSize: 10, fontWeight: 900, color: '#f87171', textDecoration: 'none', padding: '6px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, letterSpacing: '0.08em', border: '1px solid rgba(239,68,68,0.16)' }}>
                VIEW →
              </Link>
            </motion.div>
          )}

          {/* ── QUICK ACTIONS ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, ease }}>
            <SectionLabel>[ QUICK ACTIONS ]</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ActionItem
                to="/clutch"
                icon="⚡"
                label="Clutch Mode"
                desc="Upload notes — get a complete AI study guide in 60 seconds."
                color="#a78bfa"
                tag="AI"
                delay={0.3}
              />
              <ActionItem
                to="/courses"
                icon="📚"
                label="Courses"
                desc={`${courses.length} active · manage materials, syllabi & grades`}
                color={accent}
                delay={0.34}
              />
              <ActionItem
                to="/gpa"
                icon="📊"
                label="GPA Simulator"
                desc="See exactly what score you need to hit your target GPA."
                color="#34d399"
                tag="Grades"
                delay={0.38}
              />
              <ActionItem
                to="/deadlines"
                icon="🎯"
                label="TO-DO"
                desc={activeDeadlines.length > 0 ? `${activeDeadlines.length} active · ranked by danger score` : "Nothing due — you're clear for now."}
                color="#fbbf24"
                tag={urgentDeadlines.length > 0 ? `${urgentDeadlines.length} URGENT` : undefined}
                delay={0.42}
              />
            </div>
          </motion.div>

          {/* ── YOUR COURSES ── */}
          {courses.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.46, ease }}>
              <SectionLabel right={
                <Link to="/courses" style={{ fontSize: 10, fontWeight: 900, color: accent, textDecoration: 'none', letterSpacing: '0.08em' }}>SEE ALL →</Link>
              }>
                [ YOUR COURSES ]
              </SectionLabel>

              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, overflow: 'hidden', padding: '4px 6px' }}>
                {courses.slice(0, 6).map((c, i, arr) => (
                  <div key={c.id} style={{ borderBottom: i < arr.slice(0, 6).length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <CoursePill course={c} urgentCount={urgentByCourse[c.id] || 0} delay={0.48 + i * 0.05} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── ACTIVITY + TIP ROW ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, ease }}
            style={{ display: 'grid', gridTemplateColumns: clutchSessions > 0 ? '1fr 1fr' : '1fr', gap: 10 }}>

            {/* Activity card */}
            {clutchSessions > 0 && (
              <div style={{ position: 'relative', overflow: 'hidden', background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.1)', borderRadius: 16, padding: '16px 16px 14px' }}>
                <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.22em', color: 'rgba(167,139,250,0.5)', marginBottom: 10 }}>ACTIVITY</div>
                <Sparkline count={clutchSessions} />
                <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.55)', marginTop: 8 }}>
                  <span style={{ color: '#a78bfa', fontWeight: 900 }}>{clutchSessions}</span> session{clutchSessions !== 1 ? 's' : ''} total
                </div>
              </div>
            )}

            {/* Pro tip */}
            <div style={{ position: 'relative', overflow: 'hidden', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '16px 16px 14px' }}>
              <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.18)', marginBottom: 8 }}>PRO TIP</div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', margin: 0, lineHeight: 1.6 }}>
                <span style={{ fontWeight: 900, color: '#fbbf24' }}>48h rule.</span>{' '}
                Students who run Clutch Mode 2 days before an exam — not the night before — score an average of{' '}
                <span style={{ color: '#34d399', fontWeight: 800 }}>12% higher.</span>
              </p>
            </div>
          </motion.div>

        </div>
      )}
    </div>
  )
}
