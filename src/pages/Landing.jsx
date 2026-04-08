import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from 'motion/react'

/* ─────────────────────────────────────────── */
/*  UTILITIES                                   */
/* ─────────────────────────────────────────── */
function useLiveClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id) }, [])
  const p = n => String(n).padStart(2, '0')
  return `${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())}`
}

function useMouseParallax(strength = 0.012) {
  const x = useMotionValue(0), y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 60, damping: 20 })
  const sy = useSpring(y, { stiffness: 60, damping: 20 })
  const onMove = useCallback(e => {
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2
    x.set((e.clientX - cx) * strength)
    y.set((e.clientY - cy) * strength)
  }, [x, y, strength])
  return { sx, sy, onMove }
}

/* ─────────────────────────────────────────── */
/*  COMPONENTS                                  */
/* ─────────────────────────────────────────── */
function Marquee({ items, speed = 40 }) {
  return (
    <div className="overflow-hidden select-none" style={{
      maskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)'
    }}>
      <motion.div
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
        className="flex gap-0 whitespace-nowrap">
        {[...items, ...items].map((item, i) => (
          <div key={i} className="flex items-center gap-8 px-8">
            <span className="text-[11px] font-black uppercase tracking-[0.22em]"
              style={{ color: 'rgba(255,255,255,0.18)' }}>{item}</span>
            <span style={{ color: 'rgba(59,130,246,0.4)', fontSize: 5 }}>◆</span>
          </div>
        ))}
      </motion.div>
    </div>
  )
}

function AnnotationBox({ label, style, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="absolute pointer-events-none"
      style={style}>
      <div className="px-2.5 py-1 rounded text-[10px] font-mono font-bold whitespace-nowrap"
        style={{ backgroundColor: '#6366f1', color: 'white', letterSpacing: '0.02em' }}>
        {label}
      </div>
    </motion.div>
  )
}

function AnnotationCallout({ label, value, style, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
      className="absolute pointer-events-none"
      style={style}>
      <div className="flex items-center gap-2">
        <div className="w-5 h-px" style={{ backgroundColor: 'rgba(99,102,241,0.5)' }} />
        <div className="px-2.5 py-1.5 rounded text-[10px] font-mono leading-tight"
          style={{ backgroundColor: 'rgba(18,18,40,0.95)', border: '1px solid rgba(99,102,241,0.4)', color: 'rgba(200,200,255,0.85)' }}>
          <span style={{ color: 'rgba(130,130,180,0.7)' }}>{label}</span>
          {value && <><span style={{ color: 'rgba(130,130,180,0.5)' }}> → </span><span style={{ color: '#a5b4fc' }}>{value}</span></>}
        </div>
      </div>
    </motion.div>
  )
}

function FeatureCard({ icon, tag, title, description, gradient, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6, scale: 1.01 }}
      className="group relative p-6 rounded-3xl overflow-hidden cursor-default"
      style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Hover glow */}
      <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(ellipse at 40% 0%, ${gradient}18 0%, transparent 70%)` }} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${gradient})` }}>
            {icon}
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.18em] px-2.5 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}>{tag}</span>
        </div>
        <h3 className="text-base font-black mb-2" style={{ color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}>{title}</h3>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>{description}</p>
        <div className="mt-5 flex items-center gap-1.5 text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: gradient.split(',')[0] }}>
          Explore <span>→</span>
        </div>
      </div>
    </motion.div>
  )
}

function StepLine({ active }) {
  return (
    <div className="flex-1 h-px mx-4 relative overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
      {active && (
        <motion.div className="absolute inset-y-0 left-0 h-full"
          initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }}
          viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.3 }}
          style={{ background: 'linear-gradient(to right, #3b82f6, #06b6d4)', transformOrigin: 'left' }} />
      )}
    </div>
  )
}

/* ─────────────────────────────────────────── */
/*  MAIN                                        */
/* ─────────────────────────────────────────── */
export default function Landing() {
  const clock = useLiveClock()
  const { sx, sy, onMove } = useMouseParallax(0.018)
  const heroRef = useRef(null)

  const { scrollY } = useScroll()
  const heroTextY = useTransform(scrollY, [0, 700], [0, -100])
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0])

  const [hovered, setHovered] = useState(null)

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: '#080a0e', color: 'white' }}>

      {/* ── DOT GRID ── */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.038) 1px, transparent 1px)',
        backgroundSize: '28px 28px', zIndex: 0
      }} />

      {/* ── AMBIENT GLOW ── */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '5%', left: '50%', transform: 'translateX(-50%)',
          width: 900, height: 600, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(59,130,246,0.10) 0%, transparent 70%)'
        }} />
        <div style={{
          position: 'absolute', top: '60%', right: '-5%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)'
        }} />
      </div>

      {/* ── NAV ── */}
      <motion.nav
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-0 z-50"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.055)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', backgroundColor: 'rgba(8,10,14,0.82)' }}>
        <div className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-black text-lg tracking-tight" style={{ letterSpacing: '-0.04em' }}>CLUTCH</span>
          </div>

          {/* Clock */}
          <span className="hidden md:block font-mono text-xs tracking-[0.18em]"
            style={{ color: 'rgba(255,255,255,0.22)' }}>
            {clock}
          </span>

          {/* Links */}
          <div className="flex items-center gap-7">
            <a href="#features" className="hidden md:block text-[11px] font-black uppercase tracking-[0.18em] transition-colors duration-200 hover:text-white"
              style={{ color: 'rgba(255,255,255,0.35)' }}>Features</a>
            <a href="#how" className="hidden md:block text-[11px] font-black uppercase tracking-[0.18em] transition-colors duration-200 hover:text-white"
              style={{ color: 'rgba(255,255,255,0.35)' }}>How It Works</a>
            <Link to="/login" className="text-[11px] font-black uppercase tracking-[0.18em] transition-colors duration-200 hover:text-white"
              style={{ color: 'rgba(255,255,255,0.35)' }}>Sign In</Link>
            <Link to="/signup"
              className="px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-[0.12em] text-white transition-all duration-300 hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', boxShadow: '0 0 20px rgba(59,130,246,0.3)' }}>
              Get Started
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ═══════════════════════════════════════ */}
      {/* HERO                                    */}
      {/* ═══════════════════════════════════════ */}
      <section ref={heroRef} onMouseMove={onMove}
        className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center overflow-hidden"
        style={{ zIndex: 1 }}>

        <motion.div style={{ y: heroTextY, opacity: heroOpacity }} className="flex flex-col items-center">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-10 flex items-center gap-2 px-4 py-2 rounded-full border"
            style={{ borderColor: 'rgba(59,130,246,0.25)', backgroundColor: 'rgba(59,130,246,0.07)' }}>
            <span style={{ color: '#3b82f6', fontSize: 8 }}>◆</span>
            <span className="text-[10px] font-black uppercase tracking-[0.25em]"
              style={{ color: 'rgba(59,130,246,0.8)' }}>AI-Powered Study Platform</span>
          </motion.div>

          {/* MAIN HEADLINE BLOCK */}
          <div className="relative">

            {/* Figma annotation: h1/Brand */}
            <AnnotationBox label="h1 / Brand" delay={0.55}
              style={{ top: -36, left: 0 }} />

            {/* Dashed selection box */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="absolute pointer-events-none rounded"
              style={{
                inset: '-14px -24px',
                border: '1.5px dashed rgba(99,102,241,0.45)',
                borderRadius: 6
              }} />

            {/* "CLUTCH" — filled */}
            <motion.h1
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              style={{
                x: sx, y: sy,
                fontSize: 'clamp(72px, 15vw, 210px)',
                fontWeight: 900,
                letterSpacing: '-0.055em',
                lineHeight: 0.82,
                color: 'white',
              }}>
              CLUTCH
            </motion.h1>

            {/* Right-side annotation */}
            <AnnotationCallout label="tracking" value="-0.055em" delay={0.75}
              style={{ top: '28%', right: -10, transform: 'translateX(100%)' }} />

            {/* Bottom annotation */}
            <AnnotationCallout label="mode" value="teaching" delay={0.85}
              style={{ bottom: '15%', right: -10, transform: 'translateX(100%)' }} />
          </div>

          {/* "SMARTER." — outline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            style={{
              x: sx, y: sy,
              fontSize: 'clamp(72px, 15vw, 210px)',
              fontWeight: 900,
              letterSpacing: '-0.055em',
              lineHeight: 0.82,
              color: 'transparent',
              WebkitTextStroke: '1.5px rgba(255,255,255,0.18)',
              marginTop: '0.06em',
            }}>
            SMARTER.
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.32 }}
            className="mt-12 text-lg max-w-md leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.38)' }}>
            Upload your notes, slides, and lectures.
            Get AI that actually <em style={{ color: 'rgba(255,255,255,0.65)', fontStyle: 'normal' }}>teaches you the content</em> — not just how to study it.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.48 }}
            className="flex flex-wrap items-center justify-center gap-4 mt-10">
            <Link to="/signup"
              className="group flex items-center gap-2.5 px-8 py-4 rounded-2xl text-sm font-black text-white transition-all duration-300"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', boxShadow: '0 0 40px rgba(59,130,246,0.35)' }}>
              Start for Free
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>→</motion.span>
            </Link>
            <a href="#features"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-bold border transition-all duration-300 hover:border-white/20"
              style={{ borderColor: 'rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
              See How It Works
            </a>
          </motion.div>

          {/* Social proof pill */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-8 flex items-center gap-3 text-[11px]"
            style={{ color: 'rgba(255,255,255,0.25)' }}>
            <div className="flex -space-x-2">
              {['#3b82f6','#06b6d4','#22c55e','#f59e0b'].map((c, i) => (
                <div key={i} className="w-6 h-6 rounded-full border-2"
                  style={{ backgroundColor: c, borderColor: '#080a0e' }} />
              ))}
            </div>
            <span>10,000+ students studying smarter</span>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-10 flex flex-col items-center gap-2"
          style={{ color: 'rgba(255,255,255,0.15)' }}>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </motion.div>
      </section>

      {/* ── MARQUEE ── */}
      <div className="py-5 relative z-10" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Marquee items={['Clutch Mode', 'GPA Simulator', 'Deadline Tracker', 'Course Hub', 'AI Teaching', 'Exam Prep', 'File Upload', 'Auto Syllabus', 'Smart Notes', 'Study Faster']} speed={45} />
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* WHAT IS CLUTCH — Diagram section        */}
      {/* ═══════════════════════════════════════ */}
      <section className="relative z-10 py-32 px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left: text */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-4 text-[10px] font-black uppercase tracking-[0.25em]"
              style={{ color: 'rgba(59,130,246,0.7)' }}>
              [ WHAT IS CLUTCH ]
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.05 }}
              className="text-5xl font-black leading-none mb-6"
              style={{ letterSpacing: '-0.04em', color: 'white' }}>
              WHERE AI<br />BECOMES YOUR<br />
              <span style={{ color: 'transparent', WebkitTextStroke: '1.5px rgba(255,255,255,0.25)' }}>PROFESSOR.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="text-base leading-relaxed mb-8"
              style={{ color: 'rgba(255,255,255,0.4)', maxWidth: 420 }}>
              Most study tools tell you to "review your notes." Clutch reads your actual materials and creates deep concept breakdowns, worked examples, and exam predictions — personalized to your exact content.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-3">
              {[
                { label: 'Upload notes, slides, PDFs', icon: '↑' },
                { label: 'AI extracts core concepts + examples', icon: '◈' },
                { label: 'Get exam-ready in minutes', icon: '⚡' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.25 + i * 0.08 }}
                  className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                    style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}>{item.icon}</div>
                  <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>{item.label}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right: diagram card (Sutera-inspired) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative">

            {/* Main card */}
            <div className="relative rounded-3xl overflow-hidden p-8"
              style={{ backgroundColor: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', minHeight: 360 }}>

              {/* Grid lines */}
              <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
              }} />

              {/* Center element */}
              <div className="relative z-10 flex flex-col items-center justify-center h-full gap-6 py-4">

                {/* File input node */}
                <div className="flex gap-3">
                  {['PDF', 'PPTX', 'TXT', 'MP4'].map((ext, i) => (
                    <motion.div key={ext}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.4 + i * 0.07 }}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-black border"
                      style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.04)' }}>
                      .{ext}
                    </motion.div>
                  ))}
                </div>

                {/* Arrow down */}
                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ color: 'rgba(59,130,246,0.6)' }}>
                  <svg width="20" height="36" viewBox="0 0 20 36" fill="none">
                    <line x1="10" y1="0" x2="10" y2="28" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
                    <path d="M4 22l6 8 6-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                </motion.div>

                {/* AI core node */}
                <motion.div
                  animate={{ boxShadow: ['0 0 0px rgba(59,130,246,0)', '0 0 30px rgba(59,130,246,0.35)', '0 0 0px rgba(59,130,246,0)'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-24 h-24 rounded-3xl flex flex-col items-center justify-center gap-1"
                  style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(6,182,212,0.15))', border: '1px solid rgba(59,130,246,0.3)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: '#60a5fa' }}>CLUTCH AI</span>
                </motion.div>

                {/* Arrow down */}
                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                  style={{ color: 'rgba(6,182,212,0.6)' }}>
                  <svg width="20" height="36" viewBox="0 0 20 36" fill="none">
                    <line x1="10" y1="0" x2="10" y2="28" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
                    <path d="M4 22l6 8 6-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                </motion.div>

                {/* Output chips */}
                <div className="flex flex-wrap gap-2 justify-center max-w-[260px]">
                  {['Core Concepts', 'Worked Examples', 'Exam Predictions', 'Misconceptions'].map((chip, i) => (
                    <motion.div key={chip}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.6 + i * 0.07 }}
                      className="px-3 py-1.5 rounded-full text-[10px] font-bold"
                      style={{ backgroundColor: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', color: '#22d3ee' }}>
                      {chip}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Callout lines */}
              <div className="absolute top-6 right-0 translate-x-full pl-3 hidden xl:block pointer-events-none">
                <div className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  <div className="mb-1">CLUTCH /25</div>
                  <div className="font-bold" style={{ color: 'rgba(255,255,255,0.45)' }}>CL (CLUTCH)</div>
                  <div>+ ITCH (PRESSURE)</div>
                  <div className="mt-1" style={{ color: 'rgba(59,130,246,0.6)' }}>→ PERFORM UNDER PRESSURE</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ */}
      {/* FEATURES                                */}
      {/* ═══════════════════════════════════════ */}
      <section id="features" className="relative z-10 py-24 px-8 max-w-7xl mx-auto">

        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-[10px] font-black uppercase tracking-[0.25em] mb-4"
            style={{ color: 'rgba(59,130,246,0.7)' }}>
            [ CORE THREADS ]
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="text-5xl font-black"
            style={{ letterSpacing: '-0.04em', color: 'white' }}>
            Everything you need.<br />
            <span style={{ color: 'transparent', WebkitTextStroke: '1.5px rgba(255,255,255,0.22)' }}>Nothing you don't.</span>
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FeatureCard delay={0}
            gradient="#3b82f6, #06b6d4"
            tag="AI"
            icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            title="Clutch Mode"
            description="Upload your materials. AI builds deep concept breakdowns, worked examples, and exam predictions specific to your content." />
          <FeatureCard delay={0.07}
            gradient="#22c55e, #16a34a"
            tag="Grades"
            icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            title="GPA Simulator"
            description="Run what-if scenarios. See exactly what score you need on every exam to hit your target GPA. No guesswork." />
          <FeatureCard delay={0.14}
            gradient="#f59e0b, #d97706"
            tag="Deadlines"
            icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            title="Deadline Tracker"
            description="Danger-scored tasks ranked by urgency, weight, and difficulty. Upload a syllabus and it auto-populates everything." />
          <FeatureCard delay={0.21}
            gradient="#8b5cf6, #7c3aed"
            tag="Hub"
            icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
            title="Course Hub"
            description="One home for every class. Add materials, track progress, and launch Clutch Mode directly from any course page." />
        </div>
      </section>

      {/* ═══════════════════════════════════════ */}
      {/* HOW IT WORKS                            */}
      {/* ═══════════════════════════════════════ */}
      <section id="how" className="relative z-10 py-24 px-8 max-w-5xl mx-auto">

        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-[10px] font-black uppercase tracking-[0.25em] mb-4"
            style={{ color: 'rgba(59,130,246,0.7)' }}>
            [ HOW IT WORKS ]
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="text-5xl font-black"
            style={{ letterSpacing: '-0.04em', color: 'white' }}>
            Three steps.<br />
            <span style={{ color: 'transparent', WebkitTextStroke: '1.5px rgba(255,255,255,0.22)' }}>Zero excuses.</span>
          </motion.h2>
        </div>

        {/* Steps row */}
        <div className="flex items-start gap-0">
          {[
            {
              n: '01',
              title: 'Add Your Courses',
              body: 'Set up your semester. Upload syllabi and watch deadlines auto-populate. Every class gets its own hub.',
              color: '#3b82f6'
            },
            {
              n: '02',
              title: 'Drop Your Materials',
              body: 'Lecture notes, slides, PDFs, past exams — drag them in. Clutch reads everything so you don\'t have to.',
              color: '#06b6d4'
            },
            {
              n: '03',
              title: 'Get Exam-Ready',
              body: 'Receive a personalized teaching guide: core concepts, examples, likely exam questions. Go ace it.',
              color: '#22c55e'
            },
          ].map((step, i) => (
            <div key={i} className="flex items-start flex-1">
              <motion.div
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.65, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="flex-1 px-2">
                {/* Number */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black"
                    style={{ backgroundColor: `${step.color}18`, color: step.color, border: `1px solid ${step.color}30` }}>
                    {step.n}
                  </div>
                  {i < 2 && <StepLine active={true} />}
                </div>
                <h3 className="text-base font-black mb-2" style={{ color: 'white', letterSpacing: '-0.02em' }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>{step.body}</p>
              </motion.div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════ */}
      {/* TESTIMONIALS                             */}
      {/* ═══════════════════════════════════════ */}
      <section className="relative z-10 py-24 px-8 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-[10px] font-black uppercase tracking-[0.25em] mb-4"
            style={{ color: 'rgba(59,130,246,0.7)' }}>
            [ REAL STUDENTS ]
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="text-4xl font-black"
            style={{ letterSpacing: '-0.04em', color: 'white' }}>
            Grades don't lie.
          </motion.h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              quote: "I uploaded my biochem notes at 11pm before a 9am exam. Clutch gave me a breakdown I actually understood. Got a 91.",
              name: 'Aisha K.', role: 'Pre-Med, Junior', color: '#3b82f6',
            },
            {
              quote: "The GPA simulator told me I needed an 84 on my final to keep my scholarship GPA. I studied exactly that hard. Hit an 87.",
              name: 'Marcus C.', role: 'CS, Sophomore', color: '#06b6d4',
            },
            {
              quote: "I have 5 courses and no time. Clutch Mode turns a 2-hour reading into a 20-minute study guide. It's unfair to everyone else.",
              name: 'Sofia R.', role: 'Finance, Senior', color: '#22c55e',
            },
          ].map((t, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.65, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="relative p-7 rounded-3xl"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="text-3xl mb-4 leading-none" style={{ color: t.color, opacity: 0.4 }}>"</div>
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.6)' }}>{t.quote}</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black"
                  style={{ background: `${t.color}22`, color: t.color, border: `1px solid ${t.color}33` }}>
                  {t.name[0]}
                </div>
                <div>
                  <div className="text-sm font-black" style={{ color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.01em' }}>{t.name}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════ */}
      {/* STATS                                   */}
      {/* ═══════════════════════════════════════ */}
      <section className="relative z-10 py-24 px-8"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {[
            { value: '10K+', label: 'Active Students', color: '#3b82f6' },
            { value: '48h', label: 'Before Exam', color: '#06b6d4' },
            { value: '12%', label: 'Avg Score Improvement', color: '#22c55e' },
            { value: '60s', label: 'To Your Study Guide', color: '#f59e0b' },
          ].map((stat, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08 }}>
              <div className="text-5xl font-black mb-2" style={{ color: stat.color, letterSpacing: '-0.04em' }}>{stat.value}</div>
              <div className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.3)' }}>{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════ */}
      {/* FINAL CTA                               */}
      {/* ═══════════════════════════════════════ */}
      <section className="relative z-10 py-36 px-8 text-center overflow-hidden">
        {/* Big glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div style={{
            width: 600, height: 400,
            background: 'radial-gradient(ellipse, rgba(59,130,246,0.15) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 max-w-3xl mx-auto">

          <div className="text-[10px] font-black uppercase tracking-[0.25em] mb-6"
            style={{ color: 'rgba(59,130,246,0.7)' }}>
            [ START TODAY ]
          </div>

          <h2 className="font-black leading-none mb-3"
            style={{ fontSize: 'clamp(52px, 9vw, 120px)', letterSpacing: '-0.05em', color: 'white' }}>
            STOP
          </h2>
          <h2 className="font-black leading-none mb-3"
            style={{ fontSize: 'clamp(52px, 9vw, 120px)', letterSpacing: '-0.05em', color: 'transparent', WebkitTextStroke: '1.5px rgba(255,255,255,0.2)' }}>
            CRAMMING.
          </h2>
          <h2 className="font-black leading-none mb-10"
            style={{ fontSize: 'clamp(52px, 9vw, 120px)', letterSpacing: '-0.05em', color: 'white' }}>
            START CLUTCHING.
          </h2>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/signup"
              className="group flex items-center gap-2.5 px-10 py-4 rounded-2xl text-sm font-black text-white transition-all duration-300"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', boxShadow: '0 0 50px rgba(59,130,246,0.45)' }}>
              Get Started Free
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.8, repeat: Infinity }}>→</motion.span>
            </Link>
          </div>

          <p className="mt-5 text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            No credit card. No commitment. Just better grades.
          </p>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 py-10 px-8"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-black text-sm tracking-tight" style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '-0.03em' }}>CLUTCH</span>
          </div>
          <div className="flex items-center gap-6">
            {['Features', 'How It Works', 'Sign In', 'Get Started'].map(link => (
              <a key={link} href="#" className="text-[10px] font-bold uppercase tracking-widest transition-colors hover:text-white"
                style={{ color: 'rgba(255,255,255,0.2)' }}>{link}</a>
            ))}
          </div>
          <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.15)' }}>© 2026 CLUTCH</span>
        </div>
      </footer>

    </div>
  )
}
