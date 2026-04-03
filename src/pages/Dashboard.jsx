import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'motion/react'
import { useDeadlines } from '../context/DeadlinesContext'
import { useGPA } from '../context/GPAContext'
import { useSessions } from '../context/SessionsContext'

const ease = [0.16, 1, 0.3, 1]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 5)  return { text: 'Still grinding?', tag: 'LATE NIGHT',  accent: '#8b5cf6' }
  if (h < 12) return { text: 'Good morning',    tag: 'MORNING',     accent: '#f59e0b' }
  if (h < 17) return { text: 'Good afternoon',  tag: 'AFTERNOON',   accent: '#3b82f6' }
  if (h < 21) return { text: 'Good evening',    tag: 'EVENING',     accent: '#06b6d4' }
  return           { text: 'Late night mode',  tag: 'NIGHT OWL',   accent: '#8b5cf6' }
}

// Animated counter hook
function useCounter(target, duration = 800) {
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

// Danger score helper (matches Deadlines page)
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
  if (days <= 2)  return { text: `${days}d left`,  color: '#f87171', urgent: true }
  if (days <= 5)  return { text: `${days}d left`,  color: '#fbbf24', urgent: false }
  return { text: `${days}d left`, color: '#475569', urgent: false }
}

// ── Stat Tile ──────────────────────────────────────────────────────────────────
function StatTile({ value, label, color, icon, delay = 0, to }) {
  const counted = useCounter(value)
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -3, scale: 1.02 }}
      transition={{ duration: 0.5, delay, ease }}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20, padding: '22px 20px',
        position: 'relative', overflow: 'hidden',
        cursor: to ? 'pointer' : 'default',
        textDecoration: 'none', display: 'block',
      }}>
      {/* Glow blob */}
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `${color}18`, filter: 'blur(20px)', pointerEvents: 'none' }} />
      <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 10 }}>{icon} {label}</div>
      <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.06em', color, lineHeight: 1 }}>{counted}</div>
    </motion.div>
  )
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{inner}</Link> : inner
}

// ── Focus Card (top urgent deadline) ──────────────────────────────────────────
function FocusCard({ deadline }) {
  if (!deadline) return null
  const tl = getTimeLeft(deadline.date)
  const score = getDangerScore(deadline)
  const isUrgent = score >= 7

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1, ease }}
      style={{
        position: 'relative', overflow: 'hidden',
        background: isUrgent
          ? 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(245,158,11,0.05))'
          : 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(6,182,212,0.04))',
        border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.15)'}`,
        borderRadius: 20, padding: '20px 22px',
      }}>
      {/* Animated pulse for urgent */}
      {isUrgent && (
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ position: 'absolute', top: 20, right: 22, width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
      )}

      <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.24em', textTransform: 'uppercase', color: isUrgent ? '#f87171' : '#3b82f6', marginBottom: 10 }}>
        {isUrgent ? '⚡ URGENT — TODAY\'S FOCUS' : '🎯 TODAY\'S FOCUS'}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'white', letterSpacing: '-0.02em', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {deadline.title}
          </div>
          {deadline.course && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 6, background: `${deadline.courseColor || '#3b82f6'}18`, border: `1px solid ${deadline.courseColor || '#3b82f6'}30` }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: deadline.courseColor || '#3b82f6' }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: deadline.courseColor || '#3b82f6', letterSpacing: '0.06em' }}>{deadline.course}</span>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: tl?.color || '#3b82f6', letterSpacing: '-0.03em' }}>{tl?.text}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2, fontWeight: 700 }}>DANGER {score.toFixed(1)}</div>
        </div>
      </div>

      <Link to="/deadlines" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 14, fontSize: 11, fontWeight: 800, color: isUrgent ? '#f87171' : '#3b82f6', textDecoration: 'none', letterSpacing: '0.06em' }}>
        View all deadlines
        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </motion.div>
  )
}

// ── Quick Action Card ──────────────────────────────────────────────────────────
function ActionCard({ to, gradient, icon, label, desc, tag, tagColor, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 3 }}
      transition={{ duration: 0.4, delay, ease }}>
      <Link to={to} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, textDecoration: 'none', transition: 'border-color 0.2s, background 0.2s' }}
        onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
        onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}>
        <motion.div whileHover={{ scale: 1.1, rotate: -4 }} transition={{ type: 'spring', stiffness: 400 }}
          style={{ width: 44, height: 44, borderRadius: 14, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </motion.div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: 'rgba(255,255,255,0.88)', letterSpacing: '-0.01em' }}>{label}</span>
            {tag && <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.15em', padding: '2px 6px', borderRadius: 4, background: `${tagColor}18`, color: tagColor, border: `1px solid ${tagColor}30` }}>{tag}</span>}
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{desc}</p>
        </div>
        <svg style={{ color: 'rgba(255,255,255,0.15)', flexShrink: 0 }} width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </motion.div>
  )
}

// ── Course Row ─────────────────────────────────────────────────────────────────
function CourseRow({ course, urgentCount, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ x: 2 }}
      transition={{ delay, ease }}>
      <Link to={`/courses/${course.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 14, textDecoration: 'none', transition: 'background 0.15s' }}
        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
        onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: course.color, boxShadow: `0 0 8px ${course.color}60`, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.code} — {course.name}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>{course.credits} credits{course.professor ? ` · ${course.professor}` : ''}</div>
        </div>
        {urgentCount > 0 && (
          <div style={{ flexShrink: 0, fontSize: 9, fontWeight: 900, padding: '2px 7px', borderRadius: 5, background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
            {urgentCount} DUE
          </div>
        )}
        <svg style={{ color: 'rgba(255,255,255,0.15)', flexShrink: 0 }} width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </motion.div>
  )
}

// ── New User Onboarding ────────────────────────────────────────────────────────
function Onboarding() {
  const steps = [
    { step: 1, color: '#3b82f6', icon: '📚', title: 'Add your courses', desc: 'Create a course for each class. Upload your syllabus and we\'ll auto-pull every assignment.', to: '/courses', cta: 'Add Courses' },
    { step: 2, color: '#8b5cf6', icon: '⚡', title: 'Run Clutch Mode',   desc: 'Upload notes before any exam and get a personalized AI study guide in 60 seconds.',         to: '/clutch',  cta: 'Try Clutch' },
    { step: 3, color: '#f59e0b', icon: '🎯', title: 'Track deadlines',   desc: 'Add assignments and exams — we score them by urgency so you always know what\'s next.',       to: '/deadlines', cta: 'Open TO-DO' },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}
      style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.07), rgba(6,182,212,0.03))', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 22, padding: '26px 22px' }}>
      <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.28em', color: '#3b82f6', marginBottom: 10 }}>GET STARTED</div>
      <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.035em', color: 'white', margin: '0 0 6px' }}>Welcome to CLUTCH 👋</h2>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', margin: '0 0 20px', lineHeight: 1.5 }}>Your AI-powered study hub. 3 steps to get the most out of it.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {steps.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.1, ease }}
            style={{ display: 'flex', gap: 12, padding: '13px 14px', background: `${s.color}0d`, borderRadius: 14, border: `1px solid ${s.color}20`, alignItems: 'flex-start' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `${s.color}15`, border: `1px solid ${s.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{s.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                <span style={{ fontSize: 8, fontWeight: 900, color: s.color, letterSpacing: '0.18em', background: `${s.color}1a`, padding: '2px 6px', borderRadius: 4 }}>STEP {s.step}</span>
                <span style={{ fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.88)' }}>{s.title}</span>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', margin: '0 0 8px', lineHeight: 1.4 }}>{s.desc}</p>
              <Link to={s.to} style={{ fontSize: 10, fontWeight: 900, color: s.color, textDecoration: 'none', letterSpacing: '0.08em' }}>{s.cta} →</Link>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  const { deadlines } = useDeadlines()
  const { courses } = useGPA()
  const { sessionCount: clutchSessions } = useSessions()
  const navigate = useNavigate()
  const { text: greeting, tag: greetTag, accent } = getGreeting()

  const activeDeadlines = deadlines.filter(d => !d.completed && d.date && new Date(d.date) >= new Date())
  const urgentDeadlines = activeDeadlines.filter(d => getDangerScore(d) >= 7)
  const topDeadline = [...activeDeadlines].sort((a, b) => getDangerScore(b) - getDangerScore(a))[0]

  const isNewUser = courses.length === 0

  // Per-course urgent count
  const urgentByCourse = {}
  urgentDeadlines.forEach(d => {
    if (d.courseId) urgentByCourse[d.courseId] = (urgentByCourse[d.courseId] || 0) + 1
  })

  return (
    <div style={{ paddingBottom: 32 }}>
      <style>{`
        @keyframes db-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
      `}</style>

      {/* ── HERO GREETING ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, marginBottom: 18, padding: '30px 26px 26px' }}
        className="hero-greeting">
        <style>{`
          .hero-greeting {
            background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%);
            border: 1px solid rgba(255,255,255,0.07);
          }
        `}</style>

        {/* BG glow */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(ellipse, ${accent}22 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, left: '30%', width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(6,182,212,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Tag */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, ease }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: accent, boxShadow: `0 0 8px ${accent}` }} />
          <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.28em', textTransform: 'uppercase', color: accent }}>{greetTag}</span>
        </motion.div>

        {/* Name + greeting */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, ease }}>
          <h1 style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 900, letterSpacing: '-0.045em', color: 'white', margin: '0 0 4px', lineHeight: 1.1 }}>
            {greeting}
            {user?.email && (
              <span style={{ color: accent }}>
                {', '}
                {user.email.split('@')[0].split(/[._-]/)[0].charAt(0).toUpperCase() + user.email.split('@')[0].split(/[._-]/)[0].slice(1).toLowerCase()}
              </span>
            )}
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
            {isNewUser
              ? "Let's get your semester set up."
              : urgentDeadlines.length > 0
                ? `${urgentDeadlines.length} urgent deadline${urgentDeadlines.length > 1 ? 's' : ''} need your attention.`
                : courses.length > 0
                  ? `${courses.length} course${courses.length > 1 ? 's' : ''} active · ${clutchSessions} Clutch session${clutchSessions !== 1 ? 's' : ''} total.`
                  : "You're all caught up. Nice work."
            }
          </p>
        </motion.div>
      </motion.div>

      {isNewUser ? (
        <Onboarding />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* ── STATS ROW ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <StatTile value={activeDeadlines.length} label="Deadlines" icon="📅" color={activeDeadlines.length > 5 ? '#ef4444' : activeDeadlines.length > 2 ? '#fbbf24' : '#34d399'} delay={0.05} to="/deadlines" />
            <StatTile value={courses.length}          label="Courses"   icon="📚" color="#3b82f6"  delay={0.1}  to="/courses" />
            <StatTile value={clutchSessions}           label="Sessions"  icon="⚡" color="#8b5cf6"  delay={0.15} to="/clutch" />
          </div>

          {/* ── TODAY'S FOCUS ── */}
          {topDeadline && <FocusCard deadline={topDeadline} />}

          {/* ── URGENT BANNER (if no top deadline shown but has urgents) ── */}
          {!topDeadline && urgentDeadlines.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, ease }}
              style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(245,158,11,0.05))', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#f87171" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#f87171' }}>{urgentDeadlines.length} deadline{urgentDeadlines.length > 1 ? 's' : ''} due within 48h</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{urgentDeadlines[0].title}{urgentDeadlines.length > 1 ? ` +${urgentDeadlines.length - 1} more` : ''}</div>
              </div>
              <Link to="/deadlines" style={{ fontSize: 11, fontWeight: 800, color: '#f87171', textDecoration: 'none', padding: '6px 12px', background: 'rgba(239,68,68,0.12)', borderRadius: 8 }}>View →</Link>
            </motion.div>
          )}

          {/* ── QUICK ACTIONS ── */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, ease }}>
            <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginBottom: 10 }}>Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ActionCard to="/clutch" gradient="linear-gradient(135deg,#3b82f6,#06b6d4)" tag="AI" tagColor="#3b82f6" label="Clutch Mode" desc="Exam coming up? Study guide in 60 seconds." icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} delay={0.25} />
              <ActionCard to="/courses" gradient="linear-gradient(135deg,#06b6d4,#3b82f6)" label="Courses" desc={`${courses.length} active · manage materials, syllabi & grades`} icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>} delay={0.3} />
              <ActionCard to="/gpa" gradient="linear-gradient(135deg,#22c55e,#16a34a)" tag="Grades" tagColor="#22c55e" label="GPA Simulator" desc="See what score you need to hit your target GPA." icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 20V10M12 20V4M6 20v-6" /></svg>} delay={0.35} />
              <ActionCard to="/deadlines" gradient="linear-gradient(135deg,#f59e0b,#d97706)" tag={urgentDeadlines.length > 0 ? `${urgentDeadlines.length} URGENT` : undefined} tagColor="#ef4444" label="TO-DO" desc={activeDeadlines.length > 0 ? `${activeDeadlines.length} active · ranked by danger score` : 'Nothing due — you\'re clear!'} icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" /></svg>} delay={0.4} />
            </div>
          </motion.div>

          {/* ── YOUR COURSES ── */}
          {courses.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, ease }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)' }}>Your Courses</div>
                <Link to="/courses" style={{ fontSize: 10, fontWeight: 800, color: '#3b82f6', textDecoration: 'none', letterSpacing: '0.06em' }}>See All →</Link>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, overflow: 'hidden', padding: '6px 4px' }}>
                {courses.slice(0, 5).map((c, i) => (
                  <CourseRow key={c.id} course={c} urgentCount={urgentByCourse[c.id] || 0} delay={0.48 + i * 0.05} />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── PRO TIP ── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, ease }}
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '14px 18px' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.6 }}>
              <span style={{ fontWeight: 900, color: '#3b82f6' }}>💡 </span>
              Students who run Clutch Mode 48h before exams — not the night before — score an average of 12% higher.
            </p>
          </motion.div>

        </div>
      )}
    </div>
  )
}
