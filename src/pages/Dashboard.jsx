import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion } from 'motion/react'
import { useDeadlines } from '../context/DeadlinesContext'
import { useGPA } from '../context/GPAContext'
import { useSessions } from '../context/SessionsContext'

const ease = [0.16, 1, 0.3, 1]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 5) return { text: "Still up?", emoji: '🌙', sub: "That's dedication. Or procrastination. Either way." }
  if (h < 12) return { text: "Good morning", emoji: '☀️', sub: "Let's make today count." }
  if (h < 17) return { text: "Good afternoon", emoji: '⚡', sub: "Afternoon grind — let's get it." }
  if (h < 21) return { text: "Good evening", emoji: '🎯', sub: "Evening session? Respect." }
  return { text: "Late night mode", emoji: '🔥', sub: "The WiFi and you are both still up. Let's go." }
}

export default function Dashboard() {
  const { user } = useAuth()
  const { deadlines } = useDeadlines()
  const { courses } = useGPA()
  const { sessionCount: clutchSessions } = useSessions()
  const { text: greeting, emoji, sub } = getGreeting()

  const activeDeadlines = deadlines.filter(d => !d.completed && new Date(d.date) >= new Date())
  const urgentDeadlines = activeDeadlines.filter(d => {
    const hours = (new Date(d.date) - new Date()) / (1000 * 60 * 60)
    return hours <= 48
  })

  const isNewUser = courses.length === 0

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease } },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-5 pb-24 sm:pb-8">

      {/* Greeting */}
      <motion.div variants={itemVariants} className="pt-1">
        <div className="flex items-baseline gap-3">
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {greeting}
          </h1>
          <span className="text-2xl">{emoji}</span>
        </div>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>
      </motion.div>

      {/* ── NEW USER ONBOARDING ── */}
      {isNewUser ? (
        <>
          <motion.div variants={itemVariants}
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(6,182,212,0.04))',
              border: '1px solid rgba(59,130,246,0.18)',
              borderRadius: 20, padding: '28px 24px',
            }}>
            <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: 12 }}>GET STARTED</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', color: 'white', margin: '0 0 8px' }}>Welcome to CLUTCH 👋</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 24px', lineHeight: 1.6 }}>
              Your AI-powered study hub. Here's how to get the most out of it in 3 steps.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                {
                  step: '1',
                  color: '#3b82f6',
                  bg: 'rgba(59,130,246,0.1)',
                  icon: '📚',
                  title: 'Add your courses',
                  desc: 'Create courses for each class this semester. Upload your syllabus and we\'ll auto-organize everything.',
                  to: '/courses',
                  cta: 'Add Courses →',
                },
                {
                  step: '2',
                  color: '#8b5cf6',
                  bg: 'rgba(139,92,246,0.1)',
                  icon: '⚡',
                  title: 'Run Clutch Mode',
                  desc: 'Before any exam, upload your notes and get a personalized study guide in 60 seconds.',
                  to: '/clutch',
                  cta: 'Try Clutch Mode →',
                },
                {
                  step: '3',
                  color: '#f59e0b',
                  bg: 'rgba(245,158,11,0.1)',
                  icon: '🎯',
                  title: 'Track your deadlines',
                  desc: 'Add assignments and exams. We\'ll rank them by urgency so you always know what to do next.',
                  to: '/deadlines',
                  cta: 'Open TO-DO →',
                },
              ].map((item, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1, ease }}
                  style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 16px', background: item.bg, borderRadius: 14, border: `1px solid ${item.color}22` }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: item.bg, border: `1px solid ${item.color}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
                  }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 8, fontWeight: 900, color: item.color, letterSpacing: '0.2em', background: `${item.color}22`, padding: '2px 7px', borderRadius: 4 }}>
                        STEP {item.step}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>{item.title}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 8px', lineHeight: 1.5 }}>{item.desc}</p>
                    <Link to={item.to} style={{ fontSize: 11, fontWeight: 800, color: item.color, textDecoration: 'none', letterSpacing: '0.05em' }}>
                      {item.cta}
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Pro tip for new users */}
          <motion.div variants={itemVariants} className="info-card p-4">
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-black" style={{ color: 'var(--color-accent-400)' }}>💡 Pro tip:</span>{' '}
              Start by adding a course and uploading your syllabus — CLUTCH will automatically pull in all your assignments and deadlines.
            </p>
          </motion.div>
        </>
      ) : (
        <>
          {/* Urgent warning banner */}
          {urgentDeadlines.length > 0 && (
            <motion.div variants={itemVariants}
              className="rounded-2xl p-4 animate-danger-pulse"
              style={{
                background: 'linear-gradient(135deg, rgba(239,68,68,0.10), rgba(245,158,11,0.06))',
                border: '1px solid rgba(239,68,68,0.22)'
              }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
                  <svg className="w-5 h-5" style={{ color: 'var(--color-danger-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black" style={{ color: 'var(--color-danger-400)' }}>
                    {urgentDeadlines.length} deadline{urgentDeadlines.length > 1 ? 's' : ''} due within 48 hours
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                    {urgentDeadlines[0].title}{urgentDeadlines.length > 1 ? ` and ${urgentDeadlines.length - 1} more` : ''}
                  </p>
                </div>
                <Link to="/deadlines"
                  className="ml-auto text-xs font-bold px-3 py-1.5 rounded-xl shrink-0 transition"
                  style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: 'var(--color-danger-400)' }}>
                  View →
                </Link>
              </div>
            </motion.div>
          )}

          {/* Stats row */}
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
            {[
              {
                value: activeDeadlines.length,
                label: 'Active Deadlines',
                color: activeDeadlines.length > 5 ? 'var(--color-danger-400)' : activeDeadlines.length > 2 ? 'var(--color-warning-400)' : 'var(--color-success-400)',
              },
              { value: courses.length, label: 'Courses', color: 'var(--color-accent-400)' },
              { value: clutchSessions, label: 'Clutch Sessions', color: 'var(--color-accent-400)' },
            ].map((stat, i) => (
              <motion.div key={i}
                whileHover={{ scale: 1.03, y: -2 }}
                transition={{ type: 'spring', stiffness: 400 }}
                className="card p-4 text-center">
                <div className="text-3xl font-black tracking-tight" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-[10px] font-bold mt-1 leading-tight" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants}>
            <h2 className="text-[10px] font-black uppercase tracking-widest mb-3 pl-1" style={{ color: 'var(--text-muted)' }}>
              Quick Actions
            </h2>
            <div className="space-y-3">
              <ActionCard
                to="/courses"
                iconBg="linear-gradient(135deg, #06b6d4, #3b82f6)"
                icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>}
                accentColor="#06b6d4"
                tagBg="rgba(6,182,212,0.12)"
                tagColor="#06b6d4"
                tag="Hub"
                title="Courses"
                description={`${courses.length} course${courses.length !== 1 ? 's' : ''} this semester. Manage materials, deadlines & syllabi.`}
                index={0}
              />
              <ActionCard
                to="/clutch"
                iconBg="linear-gradient(135deg, #3b82f6, #06b6d4)"
                icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                accentColor="var(--color-accent-400)"
                tagBg="rgba(59,130,246,0.15)"
                tagColor="var(--color-accent-400)"
                tag="AI"
                title="Clutch Mode"
                description="Exam tomorrow? Emergency study guide in 60 seconds."
                index={1}
              />
              <ActionCard
                to="/gpa"
                iconBg="linear-gradient(135deg, #22c55e, #16a34a)"
                icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                accentColor="var(--color-success-400)"
                tagBg="rgba(34,197,94,0.12)"
                tagColor="var(--color-success-400)"
                tag="Grades"
                title="GPA Simulator"
                description="See exactly what you need on finals. Run what-if scenarios."
                index={2}
              />
              <ActionCard
                to="/deadlines"
                iconBg="linear-gradient(135deg, #f59e0b, #d97706)"
                icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                accentColor="var(--color-warning-400)"
                tagBg={urgentDeadlines.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.12)'}
                tagColor={urgentDeadlines.length > 0 ? 'var(--color-danger-400)' : 'var(--color-warning-400)'}
                tag={urgentDeadlines.length > 0 ? `${urgentDeadlines.length} URGENT` : 'Priority'}
                title="Deadlines"
                description="Danger-scored tasks ranked by urgency × weight × difficulty."
                index={3}
              />
            </div>
          </motion.div>

          {/* Insight tip */}
          <motion.div variants={itemVariants} className="info-card p-4">
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-black" style={{ color: 'var(--color-accent-400)' }}>💡 Pro tip:</span>{' '}
              Students who use Clutch Mode 48 hours before exams — not the night before — score an average of 12% higher. Plan ahead when you can.
            </p>
          </motion.div>
        </>
      )}
    </motion.div>
  )
}

function ActionCard({ to, iconBg, icon, accentColor, tagBg, tagColor, tag, title, description, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.15 + index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ x: 2 }}>
      <Link to={to}
        className="flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 group card-hover"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <motion.div
          whileHover={{ scale: 1.08, rotate: -3 }}
          transition={{ type: 'spring', stiffness: 400 }}
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: iconBg }}>
          {icon}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{title}</span>
            <span className="badge" style={{ backgroundColor: tagBg, color: tagColor }}>{tag}</span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{description}</p>
        </div>
        <motion.svg
          initial={{ opacity: 0, x: -6 }}
          whileHover={{ opacity: 1, x: 0 }}
          className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-all"
          style={{ color: accentColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </motion.svg>
      </Link>
    </motion.div>
  )
}
