import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { motion, useScroll, useTransform } from 'motion/react'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

export default function Landing() {
  const { theme, toggleTheme } = useTheme()
  const { scrollY } = useScroll()
  const orb1Y = useTransform(scrollY, [0, 600], [0, 60])
  const orb2Y = useTransform(scrollY, [0, 600], [0, -40])

  return (
    <div className="min-h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <motion.div style={{ y: orb1Y, background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', opacity: 0.3 }}
          className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full" />
        <motion.div style={{ y: orb2Y, background: 'radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)', opacity: 0.2 }}
          className="absolute top-[30%] right-[-15%] w-[500px] h-[500px] rounded-full" />
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-50 glass-nav border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center justify-between px-6 py-3.5 max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}
            className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center glow-accent-sm"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-extrabold text-lg tracking-tight" style={{ color: 'var(--text-primary)' }}>CLUTCH</span>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}
            className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-lg transition hover:bg-[var(--bg-input)]" style={{ color: 'var(--text-muted)' }}>
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <Link to="/login" className="hidden sm:block text-sm font-medium px-4 py-2 rounded-lg transition hover:bg-[var(--bg-input)]" style={{ color: 'var(--text-secondary)' }}>Log in</Link>
            <Link to="/signup" className="btn-glow text-sm px-5 py-2.5">Get started</Link>
          </motion.div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-5xl mx-auto px-6 pt-20 sm:pt-28 pb-20 text-center">
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 card-glow" style={{ color: 'var(--color-accent-400)' }}>
              <span className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
              Built by students, for students
              <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded bg-accent-500/20 text-accent-300">v1.0</span>
            </div>
          </motion.div>

          <motion.h1 variants={fadeUp} transition={{ duration: 0.6 }}
            className="text-5xl sm:text-7xl font-black tracking-tight leading-[1.1] mb-8" style={{ color: 'var(--text-primary)' }}>
            Your exam is tomorrow.
            <br />
            <span className="gradient-text">Clutch has your back.</span>
          </motion.h1>

          <motion.p variants={fadeUp} transition={{ duration: 0.5 }}
            className="text-lg sm:text-xl max-w-2xl mx-auto mb-12 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            AI-powered exam prep, GPA simulations, and danger-scored deadlines.
            The <strong style={{ color: 'var(--text-primary)' }}>student survival platform</strong> that actually gets how you study.
          </motion.p>

          <motion.div variants={fadeUp} transition={{ duration: 0.5 }} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup" className="btn-glow text-base px-8 py-3.5 w-full sm:w-auto text-center">
              Start for free &rarr;
            </Link>
            <a href="#features" className="btn-ghost text-base px-8 py-3.5 w-full sm:w-auto text-center">
              See features
            </a>
          </motion.div>

          {/* Social proof */}
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }} className="flex items-center justify-center gap-6 mt-14">
            <div className="flex -space-x-2">
              {['#7c3aed', '#06b6d4', '#f59e0b', '#22c55e', '#ef4444'].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ backgroundColor: c, borderColor: 'var(--bg-primary)', zIndex: 5 - i }}>
                  {['J', 'S', 'M', 'A', 'K'][i]}
                </div>
              ))}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1">{[...Array(5)].map((_, i) => <StarIcon key={i} />)}</div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Loved by 2,000+ students</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }} className="text-center mb-14">
          <div className="badge inline-block mb-4" style={{ backgroundColor: 'var(--glow-color-soft)', color: 'var(--color-accent-400)' }}>CORE TOOLS</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Three tools. Zero BS.</h2>
          <p className="mt-3 text-base" style={{ color: 'var(--text-secondary)' }}>Everything you need to survive finals week.</p>
        </motion.div>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}
          className="grid sm:grid-cols-3 gap-5">
          {[
            {
              icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
              title: 'Clutch Mode', description: "Exam tomorrow? Feed it your topic and get a hyper-compressed survival guide with key concepts, formulas, and a 60-minute study plan.",
              tag: 'AI-Powered', tagColor: '#7c3aed',
            },
            {
              icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
              title: 'GPA Simulator', description: "See exactly what you need on your finals. Drag sliders, run what-if scenarios, and find the minimum score to hit your target GPA.",
              tag: 'Interactive', tagColor: '#22c55e',
            },
            {
              icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
              title: 'Deadlines', description: "Not a calendar. A danger-scored priority list that tells you exactly what to work on right now based on urgency, weight, and difficulty.",
              tag: 'Smart Priority', tagColor: '#f59e0b',
            },
          ].map((f, i) => (
            <motion.div key={i} variants={fadeUp} transition={{ duration: 0.5 }}
              whileHover={{ y: -4, boxShadow: '0 0 30px rgba(124,58,237,0.15)' }}
              className="card p-6 group cursor-default" style={{ borderColor: 'var(--border-color)' }}>
              <motion.div whileHover={{ scale: 1.1 }} transition={{ type: 'spring', stiffness: 400 }}
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                style={{ backgroundColor: `color-mix(in srgb, ${f.tagColor} 15%, var(--bg-input))`, color: f.tagColor }}>
                {f.icon}
              </motion.div>
              <div className="badge inline-block mb-3" style={{ backgroundColor: `color-mix(in srgb, ${f.tagColor} 12%, transparent)`, color: f.tagColor }}>{f.tag}</div>
              <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }} className="text-center mb-14">
          <div className="badge inline-block mb-4" style={{ backgroundColor: 'var(--glow-color-soft)', color: 'var(--color-accent-400)' }}>HOW IT WORKS</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold" style={{ color: 'var(--text-primary)' }}>From panic to prepared in 3 steps</h2>
        </motion.div>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}
          className="grid sm:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Tell us what you need', desc: "Enter your exam topic, course, or deadline. Clutch understands what you're dealing with." },
            { step: '02', title: 'Get your survival plan', desc: 'AI generates a focused study guide, GPA projections, or prioritized task list instantly.' },
            { step: '03', title: 'Execute and survive', desc: "Follow the plan, track your progress, and nail your exam. You've got this." },
          ].map((item, i) => (
            <motion.div key={i} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center">
              <div className="text-5xl font-black mb-4 gradient-text">{item.step}</div>
              <h3 className="font-bold text-base mb-2" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Stats */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value: '2K+', label: 'Active Students' },
            { value: '15K+', label: 'Study Guides Generated' },
            { value: '3.6', label: 'Avg GPA Improvement' },
            { value: '98%', label: 'Would Recommend' },
          ].map((stat, i) => (
            <motion.div key={i} variants={fadeUp} transition={{ duration: 0.4 }}
              whileHover={{ scale: 1.03 }} className="card p-5 text-center">
              <div className="text-2xl sm:text-3xl font-black gradient-text">{stat.value}</div>
              <div className="text-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Testimonials */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }} className="text-center mb-14">
          <div className="badge inline-block mb-4" style={{ backgroundColor: 'var(--glow-color-soft)', color: 'var(--color-accent-400)' }}>TESTIMONIALS</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Students love Clutch</h2>
        </motion.div>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}
          className="grid sm:grid-cols-3 gap-5">
          {[
            { quote: "Used Clutch Mode the night before my Orgo exam. Got a B+ on something I was ready to fail.", name: "Sarah K.", school: "UCLA", grade: "Junior" },
            { quote: "The GPA simulator showed me I only needed a 67 on my final to keep my scholarship. Instant relief.", name: "Marcus T.", school: "Georgia Tech", grade: "Sophomore" },
            { quote: "The deadline danger scores are genius. I finally stopped doing the easy stuff first and focused on what mattered.", name: "Aisha M.", school: "NYU", grade: "Senior" },
          ].map((t, i) => (
            <motion.div key={i} variants={fadeUp} transition={{ duration: 0.5 }}
              whileHover={{ y: -3 }} className="card p-6">
              <div className="flex gap-0.5 mb-4">{[...Array(5)].map((_, j) => <StarIcon key={j} />)}</div>
              <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>{t.name[0]}</div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.grade} &middot; {t.school}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 80 }}>
          <h2 className="text-3xl sm:text-5xl font-black mb-5" style={{ color: 'var(--text-primary)' }}>
            Stop panicking.<br /><span className="gradient-text">Start clutching.</span>
          </h2>
          <p className="text-base mb-10" style={{ color: 'var(--text-secondary)' }}>Free to use. No credit card. Takes 30 seconds to get started.</p>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="inline-block">
            <Link to="/signup" className="btn-glow text-base px-10 py-4 inline-block">Get started free &rarr;</Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10" style={{ borderColor: 'var(--border-color)' }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-sm" style={{ color: 'var(--text-muted)' }}>CLUTCH</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            &copy; {new Date().getFullYear()} Clutch. Built with sleepless nights and too much caffeine.
          </p>
        </div>
      </footer>
    </div>
  )
}

function StarIcon() {
  return <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
}
function SunIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
}
function MoonIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
}
