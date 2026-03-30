import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

export default function Landing() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Clutch</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="p-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>
          <Link to="/login" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Log in</Link>
          <Link to="/signup" className="text-sm font-semibold px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
          <span className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
          Built by students, for students
        </div>
        <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-tight mb-6" style={{ color: 'var(--text-primary)' }}>
          Your exam is tomorrow.
          <br />
          <span className="text-accent-500">Clutch has your back.</span>
        </h1>
        <p className="text-lg max-w-2xl mx-auto mb-10" style={{ color: 'var(--text-secondary)' }}>
          Emergency exam prep, GPA simulations, and smart deadline management.
          The student survival platform that actually gets how you study.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/signup" className="px-6 py-3 bg-accent-500 text-white font-semibold rounded-xl hover:bg-accent-600 transition text-base">
            Start for free
          </Link>
          <a href="#features" className="px-6 py-3 font-semibold rounded-xl transition text-base" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
            See features
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12" style={{ color: 'var(--text-primary)' }}>Three tools. Zero BS.</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          <FeatureCard
            icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            title="Clutch Mode"
            description="Exam tomorrow? Feed it your topic and get a hyper-compressed survival guide with the highest-probability content, key formulas, and a 60-minute study plan."
            tag="AI-Powered"
            tagColor="var(--color-accent-500)"
          />
          <FeatureCard
            icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            title="GPA Simulator"
            description="See exactly what you need on your finals. Drag sliders, run what-if scenarios, and find the minimum score to hit your target GPA."
            tag="Interactive"
            tagColor="var(--color-success-500)"
          />
          <FeatureCard
            icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            title="Deadlines"
            description="Not a calendar. A danger-scored priority list that tells you exactly what to work on right now based on urgency, weight, and difficulty."
            tag="Smart Priority"
            tagColor="var(--color-warning-500)"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Stop panicking. Start clutching.</h2>
        <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>Free to use. No credit card. Takes 30 seconds.</p>
        <Link to="/signup" className="inline-block px-8 py-3 bg-accent-500 text-white font-semibold rounded-xl hover:bg-accent-600 transition text-base">
          Get started free
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
        Clutch &copy; {new Date().getFullYear()}
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description, tag, tagColor }) {
  return (
    <div className="rounded-2xl p-6 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--color-accent-500)' }}>
        {icon}
      </div>
      <div className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mb-3" style={{ backgroundColor: `color-mix(in srgb, ${tagColor} 15%, transparent)`, color: tagColor }}>
        {tag}
      </div>
      <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{description}</p>
    </div>
  )
}
