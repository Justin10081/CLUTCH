import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'motion/react'
import { useCourses } from '../context/CoursesContext'
import { useDeadlines } from '../context/DeadlinesContext'
import { extractTextFromFile, parseSyllabus, syllabusToDeadlines } from '../utils/syllabusParser'
import ClutchResultView from '../components/ClutchResultView'
import { loadClutchResultForCourse } from './ClutchMode'

// ── Constants ──────────────────────────────────────────────────────────────────
const ease = [0.16, 1, 0.3, 1]
const TABS = ['Overview', 'Timeline', 'Assignments', 'Deadlines', 'Materials', 'Clutch']

const TYPE_META = {
  homework:      { label: 'HW',     color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  emoji: '📝' },
  quiz:          { label: 'QUIZ',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  emoji: '🔍' },
  exam:          { label: 'EXAM',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   emoji: '⚡' },
  project:       { label: 'PROJ',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', emoji: '🏗️' },
  paper:         { label: 'PAPER',  color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',   emoji: '📄' },
  lab:           { label: 'LAB',    color: '#10b981', bg: 'rgba(16,185,129,0.12)',  emoji: '🔬' },
  participation: { label: 'PART',   color: '#ec4899', bg: 'rgba(236,72,153,0.12)', emoji: '🙋' },
  other:         { label: 'OTHER',  color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', emoji: '📌' },
}

const PARSE_STEPS = [
  { id: 'extract',  label: 'Extracting text from file',   icon: '📖' },
  { id: 'read',     label: 'Reading course structure',     icon: '🧠' },
  { id: 'organize', label: 'Organizing assignments',        icon: '📅' },
  { id: 'done',     label: 'Everything organized',          icon: '✅' },
]

// ── Helpers ────────────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const diff = d - new Date()
  const days = Math.floor(diff / 86400000)
  if (days < 0) return 'Overdue'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 7) return `${days}d`
  if (days < 30) return `${Math.floor(days / 7)}w`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const timeColor = (dateStr) => {
  if (!dateStr) return '#64748b'
  const days = (new Date(dateStr) - new Date()) / 86400000
  if (days < 0) return '#f87171'
  if (days < 3) return '#f87171'
  if (days < 7) return '#fbbf24'
  return '#34d399'
}

const fileIcon = (type = '') => {
  if (type.includes('pdf')) return '📄'
  if (type.includes('image')) return '🖼️'
  if (type.includes('video')) return '🎬'
  return '📝'
}

const fmtSize = (b) => !b ? '' : b < 1048576 ? `${Math.round(b/1024)}KB` : `${(b/1048576).toFixed(1)}MB`

// ── Stagger container ──────────────────────────────────────────────────────────
const stagger = { animate: { transition: { staggerChildren: 0.05 } } }
const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.25 } },
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  const m = TYPE_META[type] || TYPE_META.other
  return (
    <span style={{
      fontSize: 9, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase',
      color: m.color, background: m.bg, padding: '3px 8px', borderRadius: 5,
      border: `1px solid ${m.color}33`, flexShrink: 0,
    }}>{m.label}</span>
  )
}

function StatPill({ value, label, color = '#3b82f6' }) {
  return (
    <motion.div variants={fadeUp} style={{
      padding: '14px 20px', background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, textAlign: 'center',
    }}>
      <div style={{ fontSize: 26, fontWeight: 900, color, letterSpacing: '-0.03em' }}>{value}</div>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>{label}</div>
    </motion.div>
  )
}

function InfoCard({ label, value, icon }) {
  if (!value) return null
  return (
    <motion.div variants={fadeUp} whileHover={{ y: -2 }} transition={{ duration: 0.2 }} style={{
      padding: '16px 18px', background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12,
    }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 8 }}>
        {icon && <span style={{ marginRight: 6 }}>{icon}</span>}{label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>{value}</div>
    </motion.div>
  )
}

function GradeBar({ category, weight, color }) {
  return (
    <motion.div variants={fadeUp} style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{category}</span>
        <span style={{ fontSize: 13, fontWeight: 900, color, letterSpacing: '-0.02em' }}>{weight}%</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${weight}%` }}
          transition={{ duration: 0.8, ease, delay: 0.1 }}
          style={{ height: '100%', borderRadius: 2, background: `linear-gradient(90deg, ${color}, ${color}99)` }}
        />
      </div>
    </motion.div>
  )
}

// ── Syllabus parse progress UI ─────────────────────────────────────────────────
function ParseProgress({ step, stepLabel }) {
  const stepIdx = Math.min(step, PARSE_STEPS.length - 1)
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      style={{
        padding: '32px 28px', background: 'rgba(59,130,246,0.05)',
        border: '1px solid rgba(59,130,246,0.2)', borderRadius: 16,
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <motion.div
          animate={{ rotate: stepIdx < 3 ? 360 : 0 }}
          transition={{ duration: 1.2, repeat: stepIdx < 3 ? Infinity : 0, ease: 'linear' }}
          style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid transparent', borderTopColor: '#3b82f6', borderRightColor: '#3b82f6', flexShrink: 0 }}
        />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
          {PARSE_STEPS[stepIdx]?.label || stepLabel}...
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {PARSE_STEPS.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: i <= stepIdx ? 1 : 0.25, x: 0 }}
            transition={{ delay: i * 0.12, duration: 0.35 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
              background: i < stepIdx ? 'rgba(52,211,153,0.15)' : i === stepIdx ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${i < stepIdx ? 'rgba(52,211,153,0.4)' : i === stepIdx ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
            }}>
              {i < stepIdx ? '✓' : s.icon}
            </div>
            <span style={{ fontSize: 12, fontWeight: i === stepIdx ? 700 : 500, color: i < stepIdx ? '#34d399' : i === stepIdx ? 'white' : 'rgba(255,255,255,0.3)' }}>
              {s.label}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function CourseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { courses, updateCourse, addMaterial, removeMaterial } = useCourses()
  const { deadlines: allDeadlines, addDeadline, setDeadlines, replaceCourseSyllabusDeadlines } = useDeadlines()
  const course = courses.find(c => c.id === id)

  const [activeTab, setActiveTab] = useState(0)
  const [editingField, setEditingField] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [selectedMaterials, setSelectedMaterials] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`clutch-sel-${id}`) || '[]') } catch { return [] }
  })
  const [parseStep, setParseStep] = useState(-1) // -1=idle, 0-3=steps, 4=done, 5=error
  const [parseMsg, setParseMsg] = useState('')
  const [parseSuccess, setParseSuccess] = useState(null)
  const [dlEditId, setDlEditId] = useState(null)
  const [dlForm, setDlForm] = useState({ title: '', date: '', type: 'homework', weight: 5, difficulty: 5 })
  const [dlShowAdd, setDlShowAdd] = useState(false)
  const [dlDeleteId, setDlDeleteId] = useState(null)
  const [syllabusDragOver, setSyllabusDragOver] = useState(false)

  const fileInputRef = useRef()
  const syllabusRef = useRef()
  const heroRef = useRef()

  const { scrollY } = useScroll()
  const heroOpacity = useTransform(scrollY, [0, 200], [1, 0.6])
  const heroY = useTransform(scrollY, [0, 200], [0, -30])

  useEffect(() => {
    if (!course) navigate('/courses', { replace: true })
  }, [course, navigate])
  if (!course) return null

  const syllabusData = course.syllabusData || null

  // Load deadlines for this course from context
  const courseDeadlines = allDeadlines
    .filter(d => d.courseId === id && !d.completed)
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  const allCourseDeadlines = allDeadlines
    .filter(d => d.courseId === id)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      if (!a.date || !b.date) return !a.date ? 1 : -1
      return new Date(a.date) - new Date(b.date)
    })

  // Bar colors for grading breakdown
  const gradeColors = ['#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#ec4899', '#f97316']

  // ── Editable fields
  const startEdit = (field) => { setEditingField(field); setEditValue(course[field] || '') }
  const saveEdit = () => { if (editingField) { updateCourse(id, { [editingField]: editValue }); setEditingField(null) } }

  const toggleDlComplete = (dlId) => setDeadlines(prev => prev.map(d => d.id === dlId ? { ...d, completed: !d.completed } : d))
  const deleteDl = (dlId) => { setDeadlines(prev => prev.filter(d => d.id !== dlId)); setDlDeleteId(null) }
  const startEditDl = (dl) => {
    setDlEditId(dl.id)
    setDlForm({ title: dl.title, date: dl.date || '', type: dl.type || 'homework', weight: dl.weight ?? 5, difficulty: dl.difficulty ?? 5 })
    setDlShowAdd(true)
  }
  const saveDl = () => {
    if (!dlForm.title || !dlForm.date) return
    if (dlEditId) {
      setDeadlines(prev => prev.map(d => d.id === dlEditId ? { ...d, ...dlForm } : d))
    } else {
      addDeadline({ ...dlForm, courseId: id, course: course.name, courseColor: course.color, completed: false, fromSyllabus: false })
    }
    setDlEditId(null)
    setDlShowAdd(false)
    setDlForm({ title: '', date: '', type: 'homework', weight: 5, difficulty: 5 })
  }

  // ── File uploads
  const handleMaterialUpload = async (files) => {
    for (const file of Array.from(files)) {
      try {
        const text = await extractTextFromFile(file)
        addMaterial(id, { name: file.name, type: file.type, size: file.size, content: (text || '').slice(0, 40000) })
      } catch {
        addMaterial(id, { name: file.name, type: file.type, size: file.size, content: '' })
      }
    }
  }

  // Persist material selection to localStorage
  useEffect(() => {
    try { localStorage.setItem(`clutch-sel-${id}`, JSON.stringify(selectedMaterials)) } catch {}
  }, [selectedMaterials, id])

  const toggleMaterialSelect = (mId) => setSelectedMaterials(prev =>
    prev.includes(mId) ? prev.filter(x => x !== mId) : [...prev, mId]
  )
  const selectAllMaterials = () => setSelectedMaterials((course?.materials || []).map(m => m.id))
  const clearMaterialSelection = () => setSelectedMaterials([])

  // ── Syllabus parse
  const handleSyllabusFile = async (file) => {
    if (!file) return

    setParseStep(0)
    setParseMsg('')
    setParseSuccess(null)

    try {
      // Step 0: Extract text
      const text = await extractTextFromFile(file)

      // Step 1: Parse with AI
      setParseStep(1)
      const onStep = (msg) => { setParseMsg(msg); setParseStep(s => Math.min(s + 1, 2)) }
      const parsed = await parseSyllabus(text, course.name, course.code, onStep)

      // Step 2: Save data
      setParseStep(2)

      // Merge AI-extracted info into course fields
      setParseMsg('Saving to your account...')
      const ci = parsed.courseInfo || {}
      const courseUpdates = {
        syllabusName: file.name,
        syllabusData: parsed,
      }
      if (ci.professor && !course.professor) courseUpdates.professor = ci.professor

      // Await the save so we know it persisted before showing success
      await updateCourse(id, courseUpdates)

      // Write deadlines via context (syncs to Supabase automatically)
      const newDeadlines = syllabusToDeadlines(parsed, id, course.name, course.code, course.color)
      if (newDeadlines.length > 0) {
        replaceCourseSyllabusDeadlines(id, newDeadlines)
      }

      // Step 3: Done
      setParseStep(3)
      setParseSuccess({ assignments: parsed.assignments?.length || 0, weeks: parsed.weeklySchedule?.length || 0, deadlines: newDeadlines.length })
      setTimeout(() => setParseStep(4), 1800)

    } catch (err) {
      console.error('Syllabus parse error:', err)
      setParseStep(5)
      setParseMsg(err.message || 'Failed to parse syllabus')
    }
  }

  const handleSyllabusUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    handleSyllabusFile(file)
  }

  const heroGradient = `linear-gradient(135deg, ${course.color}28 0%, ${course.color}0a 50%, transparent 80%)`

  const fieldStyle = {
    fontSize: 9, fontWeight: 800, letterSpacing: '0.22em',
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 6,
  }
  const editInputStyle = {
    width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.06)',
    border: '1px solid #3b82f6', borderRadius: 6, color: 'white', fontSize: 14,
    outline: 'none', boxSizing: 'border-box', boxShadow: '0 0 0 3px rgba(59,130,246,0.12)',
  }

  return (
    <div style={{ backgroundColor: '#080a0e', minHeight: '100vh', color: 'white' }}>
      <style>{`
        @keyframes cd-spin { to { transform: rotate(360deg) } }
        @keyframes cd-shimmer { 0%,100% { opacity: 0.3 } 50% { opacity: 0.7 } }
        .cd-tab-btn:hover { color: rgba(255,255,255,0.8) !important; }
        .cd-edit-btn:hover span { color: white !important; }
        .cd-item:hover { background: rgba(255,255,255,0.04) !important; }
        .cd-remove:hover { color: rgba(239,68,68,0.8) !important; }
      `}</style>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <motion.div
        ref={heroRef}
        style={{ opacity: heroOpacity, y: heroY, position: 'relative', padding: '48px 40px 44px', overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Atmospheric layers */}
        <div style={{ position: 'absolute', inset: 0, background: heroGradient, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: -80, transform: 'translateY(-50%)', width: 500, height: 350, borderRadius: '50%', background: `radial-gradient(ellipse, ${course.color}18 0%, transparent 65%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, right: -40, width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(ellipse, ${course.color}0d 0%, transparent 65%)`, pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 960, margin: '0 auto' }}>
          <Link to="/courses" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', textDecoration: 'none', marginBottom: 24, transition: 'color 0.2s' }}>
            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            All Courses
          </Link>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginBottom: 10 }}>
              SCENE 0{activeTab + 1} — {TABS[activeTab].toUpperCase()}
            </div>
            <h1 style={{ fontSize: 'clamp(34px, 5.5vw, 76px)', fontWeight: 900, lineHeight: 0.9, letterSpacing: '-0.04em', color: 'white', margin: '0 0 18px' }}>
              {course.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: course.color }}>{course.code}</span>
              {course.professor && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{course.professor}</span>}
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)' }}>{course.credits} credits</span>
              {syllabusData && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399' }}>
                  ✓ Syllabus parsed
                </motion.span>
              )}
            </div>
          </motion.div>

          {/* Target grade */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.45, ease }} style={{ position: 'absolute', top: 0, right: 0, textAlign: 'right' }}>
            <div style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 900, letterSpacing: '-0.04em', color: course.color, textShadow: `0 0 28px ${course.color}55` }}>
              {course.targetGrade || 'A'}
            </div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.18)' }}>TARGET</div>
          </motion.div>
        </div>
      </motion.div>

      {/* ── TAB BAR ───────────────────────────────────────────────────────── */}
      <div style={{ position: 'sticky', top: 72, zIndex: 100, background: 'rgba(8,10,14,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 40px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex' }}>
          {TABS.map((tab, i) => (
            <motion.button
              key={tab}
              className="cd-tab-btn"
              onClick={() => setActiveTab(i)}
              whileTap={{ scale: 0.97 }}
              style={{
                background: 'none', border: 'none',
                borderBottom: activeTab === i ? `2px solid ${course.color}` : '2px solid transparent',
                padding: '16px 18px 14px', fontSize: 10, fontWeight: 800, letterSpacing: '0.18em',
                textTransform: 'uppercase', color: activeTab === i ? 'white' : 'rgba(255,255,255,0.28)',
                transition: 'color 0.2s, border-color 0.2s', marginBottom: -1, position: 'relative',
              }}>
              {tab}
              {tab === 'Assignments' && courseDeadlines.length > 0 && (
                <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 900, color: course.color, background: `${course.color}18`, padding: '1px 5px', borderRadius: 99 }}>
                  {courseDeadlines.length}
                </span>
              )}
              {tab === 'Timeline' && syllabusData?.weeklySchedule?.length > 0 && (
                <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 900, color: '#34d399', background: 'rgba(52,211,153,0.12)', padding: '1px 5px', borderRadius: 99 }}>
                  {syllabusData.weeklySchedule.length}w
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ───────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 40px 100px' }}>
        <AnimatePresence mode="wait">

          {/* ════════════════ OVERVIEW ════════════════ */}
          {activeTab === 0 && (
            <motion.div key="overview" variants={stagger} initial="initial" animate="animate" exit="exit" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Stats row */}
              {syllabusData && (
                <motion.div variants={stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  <StatPill value={syllabusData.assignments?.length || 0} label="Total Assignments" color={course.color} />
                  <StatPill value={syllabusData.assignments?.filter(a => a.type === 'exam').length || 0} label="Exams" color="#ef4444" />
                  <StatPill value={syllabusData.weeklySchedule?.length || 0} label="Weeks" color="#10b981" />
                  <StatPill value={`${syllabusData.gradingBreakdown?.reduce((s, g) => s + (g.weight || 0), 0)}%`} label="Breakdown" color="#f59e0b" />
                </motion.div>
              )}

              {/* Course Info */}
              <motion.div variants={fadeUp} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 24 }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginBottom: 20 }}>Course Info</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 20 }}>
                  {[
                    { field: 'name', label: 'Course Name' },
                    { field: 'code', label: 'Code' },
                    { field: 'professor', label: 'Professor' },
                    { field: 'semester', label: 'Semester' },
                    { field: 'credits', label: 'Credits' },
                    { field: 'targetGrade', label: 'Target Grade' },
                  ].map(({ field, label }) => (
                    <div key={field}>
                      <div style={fieldStyle}>{label}</div>
                      {editingField === field ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingField(null) }}
                            style={editInputStyle} />
                          <button onClick={saveEdit} style={{ background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', border: 'none', borderRadius: 6, color: 'white', fontSize: 11, fontWeight: 800, padding: '0 12px' }}>✓</button>
                        </div>
                      ) : (
                        <button className="cd-edit-btn" onClick={() => startEdit(field)} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', width: '100%', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: course[field] ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.18)' }}>
                            {course[field] || `Add ${label.toLowerCase()}...`}
                          </span>
                          <svg width="10" height="10" style={{ opacity: 0.25 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Syllabus section */}
              <motion.div variants={fadeUp} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 24, overflow: 'hidden' }}>
                <input type="file" ref={syllabusRef} accept=".txt,.md,.pdf" style={{ display: 'none' }} onChange={handleSyllabusUpload} />

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginBottom: 6 }}>
                      Syllabus Intelligence
                    </div>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0, maxWidth: 420 }}>
                      Upload your syllabus — AI extracts every assignment, deadline, office hour, weekly topic, and reading automatically.
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => syllabusRef.current?.click()}
                    style={{ background: `${course.color}18`, border: `1px solid ${course.color}44`, borderRadius: 8, color: course.color, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 18px', flexShrink: 0 }}>
                    {syllabusData ? '↺ Re-parse' : '+ Upload'}
                  </motion.button>
                </div>

                {/* Parse progress */}
                <AnimatePresence mode="wait">
                  {parseStep >= 0 && parseStep < 4 && (
                    <ParseProgress key="progress" step={parseStep} stepLabel={parseMsg} />
                  )}
                  {parseStep === 5 && (
                    <motion.div key="error" {...fadeUp} style={{ padding: '16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#f87171', fontSize: 13 }}>
                      ⚠ {parseMsg || 'Failed to parse. Try a .txt or .md version of your syllabus.'}
                    </motion.div>
                  )}
                  {!syllabusData && (parseStep < 0 || parseStep === 4) && (
                    <motion.button key="upload-zone"
                      onClick={() => syllabusRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); setSyllabusDragOver(true) }}
                      onDragLeave={() => setSyllabusDragOver(false)}
                      onDrop={e => { e.preventDefault(); setSyllabusDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleSyllabusFile(f) }}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{
                        width: '100%', padding: '36px 20px',
                        background: syllabusDragOver ? `${course.color}12` : 'rgba(255,255,255,0.015)',
                        border: `1px dashed ${syllabusDragOver ? course.color : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                        transition: 'background 0.2s, border-color 0.2s',
                        transform: syllabusDragOver ? 'scale(1.01)' : 'scale(1)',
                      }}>
                      <motion.span style={{ fontSize: 32 }} animate={{ y: syllabusDragOver ? -6 : [0, -4, 0] }} transition={{ duration: syllabusDragOver ? 0.2 : 2, repeat: syllabusDragOver ? 0 : Infinity }}>
                        {syllabusDragOver ? '⬇️' : '📋'}
                      </motion.span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: syllabusDragOver ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)' }}>
                        {syllabusDragOver ? 'Drop to upload' : 'Drop your syllabus (.pdf, .txt, .md)'}
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>AI organizes everything for you instantly</span>
                    </motion.button>
                  )}
                  {syllabusData && (parseStep < 0 || parseStep === 4) && (
                    <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.18)', borderRadius: 10 }}>
                      <span style={{ fontSize: 18 }}>✅</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#34d399' }}>{course.syllabusName}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                          {syllabusData.assignments?.length || 0} assignments · {syllabusData.weeklySchedule?.length || 0} weeks · parsed {new Date(syllabusData.parsedAt || Date.now()).toLocaleDateString()}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Professor Info (from syllabus) */}
              {syllabusData?.courseInfo && Object.values(syllabusData.courseInfo).some(v => v) && (
                <motion.div variants={fadeUp} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 24 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginBottom: 16 }}>Course Details</div>
                  <motion.div variants={stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                    <InfoCard label="Professor" value={syllabusData.courseInfo.professor} icon="👤" />
                    <InfoCard label="Email" value={syllabusData.courseInfo.professorEmail} icon="📧" />
                    <InfoCard label="Office Hours" value={syllabusData.courseInfo.officeHours} icon="🕐" />
                    <InfoCard label="Office Location" value={syllabusData.courseInfo.officeLocation} icon="📍" />
                    <InfoCard label="Class Time" value={syllabusData.courseInfo.classTimes} icon="🗓" />
                    <InfoCard label="Class Location" value={syllabusData.courseInfo.classLocation} icon="🏛" />
                    <InfoCard label="Textbook" value={syllabusData.courseInfo.textbook} icon="📚" />
                    <InfoCard label="Prerequisites" value={syllabusData.courseInfo.prerequisites} icon="🔗" />
                  </motion.div>
                </motion.div>
              )}

              {/* Grading breakdown */}
              {syllabusData?.gradingBreakdown?.length > 0 && (
                <motion.div variants={fadeUp} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 24 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginBottom: 20 }}>Grading Breakdown</div>
                  <motion.div variants={stagger}>
                    {syllabusData.gradingBreakdown.map((g, i) => (
                      <GradeBar key={i} category={g.category} weight={g.weight} color={gradeColors[i % gradeColors.length]} />
                    ))}
                  </motion.div>
                </motion.div>
              )}

              {/* Policies */}
              {syllabusData?.policies && Object.values(syllabusData.policies).some(v => v) && (
                <motion.div variants={fadeUp} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 24 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginBottom: 16 }}>Course Policies</div>
                  <motion.div variants={stagger} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { key: 'lateWork', label: 'Late Work', icon: '⏰' },
                      { key: 'attendance', label: 'Attendance', icon: '📋' },
                      { key: 'grading', label: 'Grading Scale', icon: '📊' },
                      { key: 'academicIntegrity', label: 'Academic Integrity', icon: '🎓' },
                    ].map(({ key, label, icon }) => syllabusData.policies[key] ? (
                      <motion.div key={key} variants={fadeUp} style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>{icon} {label}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>{syllabusData.policies[key]}</div>
                      </motion.div>
                    ) : null)}
                  </motion.div>
                </motion.div>
              )}

              {/* Upcoming deadlines preview */}
              {courseDeadlines.length > 0 && (
                <motion.div variants={fadeUp} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)' }}>Upcoming</div>
                    <Link to="/deadlines" style={{ fontSize: 10, fontWeight: 800, color: course.color, textDecoration: 'none', letterSpacing: '0.1em' }}>View all →</Link>
                  </div>
                  <motion.div variants={stagger} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {courseDeadlines.slice(0, 4).map((d, i) => (
                      <motion.div key={i} variants={fadeUp} whileHover={{ x: 3 }} className="cd-item" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 9, borderLeft: `2px solid ${timeColor(d.date)}`, transition: 'background 0.15s' }}>
                        <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                        {d.type && <TypeBadge type={d.type} />}
                        <span style={{ fontSize: 12, fontWeight: 800, color: timeColor(d.date), flexShrink: 0 }}>{formatDate(d.date)}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ════════════════ TIMELINE ════════════════ */}
          {activeTab === 1 && (
            <motion.div key="timeline" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease }}>
              {!syllabusData || !syllabusData.weeklySchedule?.length ? (
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '72px 24px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }}>
                  <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity }} style={{ fontSize: 40, marginBottom: 16 }}>🗓</motion.div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>No timeline yet</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', marginBottom: 24 }}>Upload your syllabus in the Overview tab to auto-generate your week-by-week schedule</div>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setActiveTab(0)} style={{ padding: '12px 24px', background: `${course.color}18`, border: `1px solid ${course.color}44`, borderRadius: 10, color: course.color, fontSize: 12, fontWeight: 800, letterSpacing: '0.1em' }}>
                    → Upload Syllabus
                  </motion.button>
                </motion.div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: 32 }}>
                  {/* Vertical line */}
                  <div style={{ position: 'absolute', left: 8, top: 20, bottom: 20, width: 1.5, background: `linear-gradient(to bottom, ${course.color}66, ${course.color}11)` }} />

                  <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} variants={stagger} initial="initial" animate="animate">
                    {syllabusData.weeklySchedule.map((week, i) => (
                      <WeekCard key={i} week={week} courseColor={course.color} index={i} />
                    ))}
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}

          {/* ════════════════ ASSIGNMENTS ════════════════ */}
          {activeTab === 2 && (
            <motion.div key="assignments" variants={stagger} initial="initial" animate="animate" exit="exit" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)' }}>
                  {courseDeadlines.length + (syllabusData?.assignments?.length || 0)} items
                </div>
                <Link to="/deadlines" style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: course.color, textDecoration: 'none', padding: '8px 14px', background: `${course.color}10`, border: `1px solid ${course.color}28`, borderRadius: 6 }}>
                  + Add Manually
                </Link>
              </motion.div>

              {/* Exams first */}
              {syllabusData?.assignments?.filter(a => a.type === 'exam').length > 0 && (
                <AssignmentGroup label="Exams" emoji="⚡" color="#ef4444" assignments={syllabusData.assignments.filter(a => a.type === 'exam')} />
              )}

              {/* Quizzes */}
              {syllabusData?.assignments?.filter(a => a.type === 'quiz').length > 0 && (
                <AssignmentGroup label="Quizzes" emoji="🔍" color="#8b5cf6" assignments={syllabusData.assignments.filter(a => a.type === 'quiz')} />
              )}

              {/* Projects & papers */}
              {syllabusData?.assignments?.filter(a => ['project','paper'].includes(a.type)).length > 0 && (
                <AssignmentGroup label="Projects & Papers" emoji="🏗️" color="#f59e0b" assignments={syllabusData.assignments.filter(a => ['project','paper'].includes(a.type))} />
              )}

              {/* Homework & labs */}
              {syllabusData?.assignments?.filter(a => ['homework','lab'].includes(a.type)).length > 0 && (
                <AssignmentGroup label="Homework & Labs" emoji="📝" color="#3b82f6" assignments={syllabusData.assignments.filter(a => ['homework','lab'].includes(a.type))} />
              )}

              {/* Other */}
              {syllabusData?.assignments?.filter(a => ['other','participation'].includes(a.type)).length > 0 && (
                <AssignmentGroup label="Other" emoji="📌" color="#94a3b8" assignments={syllabusData.assignments.filter(a => ['other','participation'].includes(a.type))} />
              )}

              {/* Manual deadlines (not from syllabus) */}
              {courseDeadlines.filter(d => !d.fromSyllabus).length > 0 && (
                <AssignmentGroup label="Added Manually" emoji="✏️" color={course.color} assignments={courseDeadlines.filter(d => !d.fromSyllabus).map(d => ({ title: d.title, type: d.type, dueDate: d.date, weight: d.weight, description: '' }))} />
              )}

              {!syllabusData && courseDeadlines.length === 0 && (
                <motion.div variants={fadeUp} style={{ textAlign: 'center', padding: '64px 24px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }}>
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2.5, repeat: Infinity }} style={{ fontSize: 36, marginBottom: 12 }}>✅</motion.div>
                  <div style={{ fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>No assignments yet</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', marginBottom: 20 }}>Upload your syllabus to auto-import everything</div>
                  <motion.button whileHover={{ scale: 1.02 }} onClick={() => setActiveTab(0)} style={{ padding: '10px 20px', background: `${course.color}14`, border: `1px solid ${course.color}33`, borderRadius: 8, color: course.color, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em' }}>
                    → Upload Syllabus
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          )}


          {/* ════════════════ DEADLINES ════════════════ */}
          {activeTab === 3 && (
            <motion.div key="deadlines" variants={stagger} initial="initial" animate="animate" exit="exit" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <style>{`
                .dl-row:hover { background: rgba(255,255,255,0.04) !important; }
                .dl-row:hover .dl-actions { opacity: 1 !important; }
              `}</style>

              {/* Header */}
              <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)' }}>
                  {allCourseDeadlines.filter(d => !d.completed).length} active · {allCourseDeadlines.filter(d => d.completed).length} done
                </div>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { setDlEditId(null); setDlForm({ title: '', date: '', type: 'homework', weight: 5, difficulty: 5 }); setDlShowAdd(true) }}
                  style={{ background: `${course.color}14`, border: `1px solid ${course.color}33`, borderRadius: 8, color: course.color, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 16px' }}>
                  + Add Deadline
                </motion.button>
              </motion.div>

              {/* Deadline rows */}
              {allCourseDeadlines.length === 0 ? (
                <motion.div variants={fadeUp} style={{ textAlign: 'center', padding: '56px 24px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }}>
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2.5, repeat: Infinity }} style={{ fontSize: 36, marginBottom: 12 }}>📋</motion.div>
                  <div style={{ fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>No deadlines yet</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', marginBottom: 20 }}>Add manually or upload a syllabus to auto-import</div>
                </motion.div>
              ) : (
                <motion.div variants={stagger} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {allCourseDeadlines.map((d) => {
                    const m = TYPE_META[d.type] || TYPE_META.other
                    const days = d.date ? Math.floor((new Date(d.date) - new Date()) / 86400000) : null
                    const dateColor = days === null ? '#64748b' : days < 0 ? '#f87171' : days < 3 ? '#f87171' : days < 7 ? '#fbbf24' : '#34d399'
                    const dateLabel = days === null ? '—' : days < 0 ? 'Overdue' : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`
                    return (
                      <motion.div key={d.id} variants={fadeUp} className="dl-row"
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, transition: 'background 0.15s', background: 'rgba(255,255,255,0.02)', opacity: d.completed ? 0.5 : 1 }}>
                        {/* Checkbox */}
                        <motion.button whileTap={{ scale: 0.85 }} onClick={() => toggleDlComplete(d.id)}
                          style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${d.completed ? '#34d399' : 'rgba(255,255,255,0.2)'}`, background: d.completed ? 'rgba(52,211,153,0.15)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {d.completed && <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#34d399" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        </motion.button>
                        {/* Type badge */}
                        <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', color: m.color, background: m.bg, padding: '2px 6px', borderRadius: 4, border: `1px solid ${m.color}33`, flexShrink: 0 }}>{m.label}</span>
                        {/* Title */}
                        <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)', textDecoration: d.completed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                        {/* Date */}
                        <span style={{ fontSize: 11, fontWeight: 800, color: dateColor, flexShrink: 0 }}>{dateLabel}</span>
                        {/* Actions */}
                        <div className="dl-actions" style={{ display: 'flex', gap: 4, opacity: 0, transition: 'opacity 0.15s', flexShrink: 0 }}>
                          <button onClick={() => startEditDl(d)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', padding: '3px 5px', borderRadius: 5, cursor: 'pointer' }}>
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button onClick={() => setDlDeleteId(d.id)} style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.4)', padding: '3px 5px', borderRadius: 5, cursor: 'pointer' }}>
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}

              {/* Add / Edit form */}
              <AnimatePresence>
                {dlShowAdd && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}
                    onClick={e => { if (e.target === e.currentTarget) { setDlShowAdd(false); setDlEditId(null) } }}>
                    <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ duration: 0.3 }}
                      style={{ width: '100%', maxWidth: 480, background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px 20px 0 0', padding: '24px 24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 16, fontWeight: 900, color: 'white' }}>{dlEditId ? 'Edit Deadline' : 'Add Deadline'}</div>
                        <button onClick={() => { setDlShowAdd(false); setDlEditId(null) }} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, width: 30, height: 30, color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>✕</button>
                      </div>
                      <input type="text" value={dlForm.title} onChange={e => setDlForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="Assignment title *" autoFocus
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', padding: '12px 14px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                      <input type="date" value={dlForm.date?.slice(0, 10) || ''} onChange={e => setDlForm(f => ({ ...f, date: e.target.value }))}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', padding: '12px 14px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box', colorScheme: 'dark' }} />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {Object.entries(TYPE_META).map(([key, m]) => (
                          <button key={key} onClick={() => setDlForm(f => ({ ...f, type: key }))}
                            style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${dlForm.type === key ? m.color + '55' : 'transparent'}`, background: dlForm.type === key ? m.bg : 'rgba(255,255,255,0.04)', color: dlForm.type === key ? m.color : 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                            {m.label}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => { setDlShowAdd(false); setDlEditId(null) }}
                          style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                          Cancel
                        </button>
                        <motion.button whileTap={{ scale: 0.97 }} onClick={saveDl} disabled={!dlForm.title || !dlForm.date}
                          style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: (!dlForm.title || !dlForm.date) ? 'rgba(255,255,255,0.04)' : `linear-gradient(135deg, ${course.color}, ${course.color}cc)`, color: (!dlForm.title || !dlForm.date) ? 'rgba(255,255,255,0.25)' : 'white', fontSize: 13, fontWeight: 900, cursor: (!dlForm.title || !dlForm.date) ? 'not-allowed' : 'pointer' }}>
                          {dlEditId ? 'Save Changes' : 'Add'}
                        </motion.button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Delete confirm */}
              <AnimatePresence>
                {dlDeleteId && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} transition={{ duration: 0.2 }}
                      style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 20px', maxWidth: 300, width: '100%', textAlign: 'center' }}>
                      <div style={{ fontSize: 15, fontWeight: 900, color: 'white', marginBottom: 8 }}>Remove this deadline?</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 20 }}>"{allDeadlines.find(d => d.id === dlDeleteId)?.title}"</div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => setDlDeleteId(null)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                        <motion.button whileTap={{ scale: 0.96 }} onClick={() => deleteDl(dlDeleteId)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>Remove</motion.button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ════════════════ MATERIALS ════════════════ */}
          {activeTab === 4 && (
            <motion.div key="materials" variants={stagger} initial="initial" animate="animate" exit="exit" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <style>{`
                .mat-row:hover { background: rgba(255,255,255,0.04) !important; }
                .mat-row:hover .mat-del { opacity: 1 !important; }
                .mat-check { width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid rgba(255,255,255,0.18); background: transparent; flex-shrink: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
                .mat-check.checked { border-color: ${course.color}; background: ${course.color}22; }
              `}</style>

              <input type="file" ref={fileInputRef} multiple accept=".txt,.md,.pdf,.pptx,.docx,.csv,.jpg,.jpeg,.png,.webp" style={{ display: 'none' }} onChange={e => { handleMaterialUpload(e.target.files || []); e.target.value = '' }} />

              {/* Upload drop zone */}
              <motion.div variants={fadeUp}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleMaterialUpload(e.dataTransfer.files) }}
                onClick={() => fileInputRef.current?.click()}
                animate={{ borderColor: dragOver ? `${course.color}66` : 'rgba(255,255,255,0.1)', background: dragOver ? `${course.color}07` : 'rgba(255,255,255,0.015)' }}
                style={{ padding: '32px 24px', borderRadius: 14, border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, transition: 'background 0.2s', cursor: 'pointer' }}>
                <motion.div animate={{ scale: dragOver ? 1.1 : 1 }} style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${course.color}22, ${course.color}0a)`, border: `1px solid ${course.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" style={{ color: course.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </motion.div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.65)', marginBottom: 3 }}>Upload lecture notes, slides, or PDFs</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)' }}>Files saved here are available in CLUTCH Mode · PDF text is extracted automatically</div>
                </div>
              </motion.div>

              <motion.div variants={fadeUp} style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {['.PDF', '.TXT', '.MD', '.PPTX', '.DOCX', '.CSV', '.PNG', '.JPG'].map(fmt => (
                  <span key={fmt} style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', padding: '3px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 999, color: 'rgba(255,255,255,0.22)' }}>{fmt}</span>
                ))}
              </motion.div>

              {/* Selection controls + CLUTCH CTA */}
              {(course.materials || []).length > 0 && (
                <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)' }}>
                      {selectedMaterials.length}/{(course.materials || []).length} selected
                    </span>
                    <button onClick={selectedMaterials.length === (course.materials || []).length ? clearMaterialSelection : selectAllMaterials}
                      style={{ fontSize: 10, fontWeight: 700, color: course.color, background: `${course.color}12`, border: `1px solid ${course.color}28`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                      {selectedMaterials.length === (course.materials || []).length ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => navigate('/clutch', { state: { courseId: id, courseName: course.name, courseCode: course.code, courseColor: course.color, selectedMaterialIds: selectedMaterials.length > 0 ? selectedMaterials : undefined } })}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: selectedMaterials.length > 0 ? `linear-gradient(135deg, ${course.color}, ${course.color}bb)` : 'rgba(255,255,255,0.05)', border: selectedMaterials.length > 0 ? 'none' : '1px solid rgba(255,255,255,0.08)', borderRadius: 9, color: selectedMaterials.length > 0 ? 'white' : 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s', boxShadow: selectedMaterials.length > 0 ? `0 0 20px ${course.color}40` : 'none' }}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    {selectedMaterials.length > 0 ? `Study ${selectedMaterials.length} file${selectedMaterials.length > 1 ? 's' : ''} with CLUTCH` : 'Study all with CLUTCH'}
                  </motion.button>
                </motion.div>
              )}

              {/* Materials list */}
              <AnimatePresence>
                {course.syllabus && (
                  <motion.div key="__syllabus__" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease }}
                    className="mat-row"
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 11, transition: 'background 0.15s' }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>📋</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.syllabusName || 'Syllabus'}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>Syllabus · always included in CLUTCH</div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', padding: '2px 7px', borderRadius: 5 }}>AUTO</span>
                  </motion.div>
                )}

                {(course.materials || []).map((m) => {
                  const isSelected = selectedMaterials.includes(m.id)
                  const charCount = (m.content || '').length
                  const hasContent = charCount >= 200
                  const badgeColor = hasContent ? '#34d399' : charCount > 0 ? '#fbbf24' : '#f87171'
                  const badgeLabel = charCount === 0 ? 'No text' : charCount < 200 ? `${charCount}c` : charCount >= 1000 ? `${Math.round(charCount / 1000)}k` : `${charCount}c`
                  return (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.25, ease }}
                      className="mat-row"
                      onClick={() => toggleMaterialSelect(m.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: isSelected ? `${course.color}08` : 'rgba(255,255,255,0.02)', border: `1px solid ${isSelected ? course.color + '33' : 'rgba(255,255,255,0.07)'}`, borderRadius: 11, transition: 'all 0.15s', cursor: 'pointer' }}>
                      {/* Checkbox */}
                      <div className={`mat-check${isSelected ? ' checked' : ''}`} style={{ borderColor: isSelected ? course.color : undefined, background: isSelected ? `${course.color}22` : undefined }}>
                        {isSelected && (
                          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke={course.color} strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        )}
                      </div>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{fileIcon(m.type)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>
                          {fmtSize(m.size)}{m.uploadedAt ? ` · ${new Date(m.uploadedAt).toLocaleDateString()}` : ''}
                        </div>
                      </div>
                      {/* Char count badge */}
                      <span style={{ fontSize: 9, fontWeight: 800, color: badgeColor, background: `${badgeColor}14`, border: `1px solid ${badgeColor}30`, padding: '2px 7px', borderRadius: 5, flexShrink: 0, letterSpacing: '0.05em' }}>
                        {badgeLabel}
                      </span>
                      {/* Delete */}
                      <button className="mat-del" onClick={e => { e.stopPropagation(); removeMaterial(id, m.id); setSelectedMaterials(prev => prev.filter(x => x !== m.id)) }}
                        style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.4)', padding: '4px 5px', borderRadius: 6, display: 'flex', alignItems: 'center', opacity: 0, transition: 'opacity 0.15s', cursor: 'pointer', flexShrink: 0 }}>
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {(course.materials || []).length === 0 && !course.syllabus && (
                <motion.div variants={fadeUp} style={{ textAlign: 'center', padding: '40px 24px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14 }}>
                  <div style={{ fontSize: 30, marginBottom: 10 }}>📂</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>No materials yet</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Upload notes, slides, or PDFs above — CLUTCH will teach from them</div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ════════════════ CLUTCH ════════════════ */}
          {activeTab === 5 && (() => {
            const savedClutch = loadClutchResultForCourse(id)
            return (
              <motion.div key="clutch" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease }}>
                {savedClutch ? (
                  /* ── Saved result view ── */
                  <div>
                    <ClutchResultView
                      result={savedClutch.result}
                      topic={savedClutch.topic}
                      courseName={course.name}
                      uploadedFiles={(savedClutch.filesUsed || []).map(name => ({ name }))}
                      embedded
                      onNewSession={() => navigate('/clutch', { state: { courseId: id, courseName: course.name, courseCode: course.code, courseColor: course.color, materials: course.materials || [] } })}
                    />
                  </div>
                ) : (
                  /* ── Empty state ── */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <motion.div whileHover={{ scale: 1.005 }}
                      style={{ padding: '48px 36px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 18, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 500, height: 250, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
                      <motion.div animate={{ boxShadow: ['0 0 24px rgba(59,130,246,0.3)', '0 0 44px rgba(59,130,246,0.5)', '0 0 24px rgba(59,130,246,0.3)'] }} transition={{ duration: 2.5, repeat: Infinity }}
                        style={{ width: 60, height: 60, borderRadius: 18, margin: '0 auto 20px', background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      </motion.div>
                      <h3 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: '0 0 10px', letterSpacing: '-0.03em' }}>Clutch Mode</h3>
                      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: '0 0 32px', lineHeight: 1.65, maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
                        AI teaches you from your uploaded materials. Your last session will always be saved here.
                      </p>
                      <Link to="/clutch" state={{ courseId: id, courseName: course.name, courseCode: course.code, courseColor: course.color, materials: course.materials || [] }} style={{ textDecoration: 'none' }}>
                        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 40px', background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', borderRadius: 12, color: 'white', fontSize: 13, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', boxShadow: '0 0 36px rgba(59,130,246,0.4)' }}>
                          START SESSION
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </motion.div>
                      </Link>
                    </motion.div>
                    {(course.materials?.length > 0 || course.syllabusText) && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ padding: '18px 22px', background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.12)', borderRadius: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: '#34d399', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Ready to teach</div>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 10px', lineHeight: 1.6 }}>
                          {(course.materials?.length || 0) + (course.syllabusText ? 1 : 0)} source{(course.materials?.length || 0) + (course.syllabusText ? 1 : 0) !== 1 ? 's' : ''} ready.
                        </p>
                        {course.syllabusText && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 8 }}><span>📋</span> {course.syllabusName || 'Syllabus'}</div>}
                        {(course.materials || []).slice(0, 4).map(m => (
                          <div key={m.id} style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}><span>{fileIcon(m.type)}</span> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span></div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            )
          })()}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Week timeline card ─────────────────────────────────────────────────────────
function WeekCard({ week, courseColor, index }) {
  const [open, setOpen] = useState(index < 2)
  return (
    <motion.div
      variants={fadeUp}
      style={{ position: 'relative', paddingLeft: 24, marginBottom: 4 }}>
      {/* Dot on timeline */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: index * 0.04, type: 'spring', stiffness: 400, damping: 20 }}
        style={{ position: 'absolute', left: -4, top: 18, width: 10, height: 10, borderRadius: '50%', background: courseColor, boxShadow: `0 0 10px ${courseColor}66`, zIndex: 1 }}
      />

      <motion.div
        whileHover={{ x: 2 }}
        onClick={() => setOpen(o => !o)}
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: courseColor, background: `${courseColor}14`, padding: '4px 10px', borderRadius: 6, flexShrink: 0, border: `1px solid ${courseColor}33` }}>
              WK {week.week}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.8)' }}>
                {week.topics?.[0] || `Week ${week.week}`}
                {week.topics?.length > 1 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>+{week.topics.length - 1} more</span>}
              </div>
              {week.dates && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{week.dates}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {week.due?.length > 0 && (
              <span style={{ fontSize: 9, fontWeight: 900, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', padding: '2px 7px', borderRadius: 99 }}>
                {week.due.length} DUE
              </span>
            )}
            <motion.svg animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: 'rgba(255,255,255,0.25)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </motion.svg>
          </div>
        </div>

        {/* Expanded body */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease }}
              style={{ overflow: 'hidden' }}>
              <div style={{ padding: '0 20px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {week.topics?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', margin: '14px 0 8px' }}>TOPICS</div>
                    {week.topics.map((t, i) => (
                      <div key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 4, paddingLeft: 8, borderLeft: `2px solid ${courseColor}44` }}>{t}</div>
                    ))}
                  </div>
                )}
                {week.readings?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', margin: '14px 0 8px' }}>READINGS</div>
                    {week.readings.map((r, i) => (
                      <div key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>📖 {r}</div>
                    ))}
                  </div>
                )}
                {week.due?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', margin: '14px 0 8px' }}>DUE</div>
                    {week.due.map((d, i) => (
                      <div key={i} style={{ fontSize: 11, color: '#fbbf24', marginBottom: 4 }}>⚡ {d}</div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

// ── Assignment group ───────────────────────────────────────────────────────────
function AssignmentGroup({ label, emoji, color, assignments }) {
  return (
    <motion.div variants={fadeUp}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 8 }}>
        <span style={{ fontSize: 14 }}>{emoji}</span>
        <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>{label}</div>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ fontSize: 9, fontWeight: 800, color, background: `${color}14`, border: `1px solid ${color}33`, padding: '2px 7px', borderRadius: 99 }}>{assignments.length}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {assignments.map((a, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3, ease }}
            whileHover={{ x: 4 }}
            className="cd-item"
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `2px solid ${color}44`, borderRadius: 10, transition: 'background 0.15s' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: a.description ? 3 : 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
              {a.description && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.description}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {a.weight > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)' }}>{a.weight}%</span>}
              <TypeBadge type={a.type || 'other'} />
              {a.dueDate && (
                <span style={{ fontSize: 12, fontWeight: 800, color: timeColor(a.dueDate), minWidth: 48, textAlign: 'right' }}>
                  {formatDate(a.dueDate)}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
