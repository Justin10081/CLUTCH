import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="space-y-6 pb-20 sm:pb-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Hey there
          {user?.demo ? '' : ''}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>What do you need right now?</p>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4">
        <QuickAction
          to="/clutch"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          iconBg="bg-accent-500"
          title="Clutch Mode"
          description="Exam tomorrow? Get a survival guide in 60 seconds."
          tag="AI-Powered"
        />
        <QuickAction
          to="/gpa"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          iconBg="bg-success-500"
          title="GPA Simulator"
          description="Run what-if scenarios. See what you need on your finals."
          tag="Interactive"
        />
        <QuickAction
          to="/deadlines"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          iconBg="bg-warning-500"
          title="Deadlines"
          description="See what's due, ranked by danger level. Know what to do first."
          tag="Smart Priority"
        />
      </div>

      {/* Stats preview */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Active Deadlines" value={getDeadlineCount()} />
        <StatCard label="Courses Tracked" value={getCourseCount()} />
        <StatCard label="Clutch Sessions" value={getClutchCount()} />
      </div>
    </div>
  )
}

function QuickAction({ to, icon, iconBg, title, description, tag }) {
  return (
    <Link to={to} className="flex items-start gap-4 p-4 rounded-2xl border hover:border-accent-500/50 transition group" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center text-white shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>{tag}</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{description}</p>
      </div>
      <svg className="w-5 h-5 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl p-3 border text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</div>
      <div className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}

function getDeadlineCount() {
  try {
    const data = JSON.parse(localStorage.getItem('clutch-deadlines') || '[]')
    return data.filter(d => new Date(d.date) >= new Date()).length
  } catch { return 0 }
}

function getCourseCount() {
  try {
    const data = JSON.parse(localStorage.getItem('clutch-gpa-courses') || '[]')
    return data.length
  } catch { return 0 }
}

function getClutchCount() {
  try {
    return parseInt(localStorage.getItem('clutch-session-count') || '0')
  } catch { return 0 }
}
