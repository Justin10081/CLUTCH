import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMemo } from 'react'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 5) return { text: "Still up?", sub: "That's dedication. Or procrastination. Either way." }
  if (h < 12) return { text: "Good morning", sub: "Let's make today count." }
  if (h < 17) return { text: "Good afternoon", sub: "Afternoon grind — let's get it." }
  if (h < 21) return { text: "Good evening", sub: "Evening session? Respect." }
  return { text: "Late night mode", sub: "The WiFi and you are both still up. Let's go." }
}

function getDeadlines() {
  try { return JSON.parse(localStorage.getItem('clutch-deadlines') || '[]') } catch { return [] }
}
function getCourses() {
  try { return JSON.parse(localStorage.getItem('clutch-gpa-courses') || '[]') } catch { return [] }
}
function getClutchCount() {
  try { return parseInt(localStorage.getItem('clutch-session-count') || '0') } catch { return 0 }
}

export default function Dashboard() {
  const { user } = useAuth()
  const { text: greeting, sub } = getGreeting()

  const deadlines = useMemo(() => getDeadlines(), [])
  const courses = useMemo(() => getCourses(), [])
  const clutchSessions = getClutchCount()

  const activeDeadlines = deadlines.filter(d => !d.completed && new Date(d.date) >= new Date())
  const urgentDeadlines = activeDeadlines.filter(d => {
    const hours = (new Date(d.date) - new Date()) / (1000 * 60 * 60)
    return hours <= 48
  })

  return (
    <div className="space-y-5 pb-24 sm:pb-8 animate-fade-up">
      {/* Greeting */}
      <div className="pt-2">
        <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {greeting}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>
      </div>

      {/* Urgent deadline warning */}
      {urgentDeadlines.length > 0 && (
        <div className="rounded-2xl p-4 animate-pulse-glow" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(245,158,11,0.08))', border: '1px solid rgba(239,68,68,0.25)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--color-danger-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--color-danger-400)' }}>
                {urgentDeadlines.length} deadline{urgentDeadlines.length > 1 ? 's' : ''} due within 48 hours
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {urgentDeadlines[0].title}{urgentDeadlines.length > 1 ? ` and ${urgentDeadlines.length - 1} more` : ''}
              </p>
            </div>
            <Link to="/deadlines" className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: 'var(--color-danger-400)' }}>
              View →
            </Link>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { value: activeDeadlines.length, label: 'Active Deadlines', color: activeDeadlines.length > 5 ? 'var(--color-danger-400)' : activeDeadlines.length > 2 ? 'var(--color-warning-400)' : 'var(--color-success-400)' },
          { value: courses.length, label: 'Courses', color: 'var(--color-accent-400)' },
          { value: clutchSessions, label: 'Clutch Sessions', color: 'var(--color-accent-400)' },
        ].map((stat, i) => (
          <div key={i} className="card p-3.5 text-center" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-[10px] font-semibold mt-0.5 leading-tight" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Quick Actions</h2>
        <div className="space-y-3">
          <ActionCard
            to="/clutch"
            gradient="linear-gradient(135deg, #7c3aed22, #6d28d911)"
            iconBg="linear-gradient(135deg, #7c3aed, #6d28d9)"
            icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            accentColor="var(--color-accent-400)"
            tag="AI"
            title="Clutch Mode"
            description="Exam tomorrow? Emergency study guide in 60 seconds."
          />
          <ActionCard
            to="/gpa"
            gradient="linear-gradient(135deg, #22c55e22, #16a34a11)"
            iconBg="linear-gradient(135deg, #22c55e, #16a34a)"
            icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            accentColor="var(--color-success-400)"
            tag="Grades"
            title="GPA Simulator"
            description="See exactly what you need on finals. Run what-if scenarios."
          />
          <ActionCard
            to="/deadlines"
            gradient="linear-gradient(135deg, #f59e0b22, #d97706 11)"
            iconBg="linear-gradient(135deg, #f59e0b, #d97706)"
            icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            accentColor="var(--color-warning-400)"
            tag={urgentDeadlines.length > 0 ? `${urgentDeadlines.length} URGENT` : 'Priority'}
            title="Deadlines"
            description="Danger-scored tasks ranked by urgency × weight × difficulty."
            tagUrgent={urgentDeadlines.length > 0}
          />
        </div>
      </div>
    </div>
  )
}

function ActionCard({ to, gradient, iconBg, icon, accentColor, tag, title, description, tagUrgent }) {
  return (
    <Link to={to} className="flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 group card-hover" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
        style={{ background: iconBg }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</span>
          <span className="badge" style={{
            backgroundColor: tagUrgent ? 'rgba(239,68,68,0.15)' : 'var(--bg-input)',
            color: tagUrgent ? 'var(--color-danger-400)' : 'var(--text-muted)'
          }}>{tag}</span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{description}</p>
      </div>
      <svg className="w-4 h-4 shrink-0 transition-all duration-200 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0"
        style={{ color: accentColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}
