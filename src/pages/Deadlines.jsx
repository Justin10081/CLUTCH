import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react'
import { useCourses } from '../context/CoursesContext'
import { useDeadlines } from '../context/DeadlinesContext'

// ─── Constants ────────────────────────────────────────────────────────────────
const EMPTY_DEADLINE = {
  title: '', course: '', courseId: '', courseColor: '',
  date: '', weight: 5, difficulty: 5, type: 'assignment', completed: false,
}

const TYPE_CONFIG = {
  assignment: { label: 'Assignment', color: '#3b82f6' },
  exam:       { label: 'Exam',       color: '#ef4444' },
  quiz:       { label: 'Quiz',       color: '#f59e0b' },
  project:    { label: 'Project',    color: '#06b6d4' },
  essay:      { label: 'Essay',      color: '#22c55e' },
  other:      { label: 'Other',      color: '#8b5cf6' },
}

const ease = [0.16, 1, 0.3, 1]
const DAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDangerScore(d) {
  if (d.completed) return 0
  const daysLeft = Math.max(0, (new Date(d.date) - new Date()) / 86400000)
  let u = daysLeft <= 0 ? 10 : daysLeft <= 1 ? 9 : daysLeft <= 2 ? 8 : daysLeft <= 3 ? 7 : daysLeft <= 5 ? 5 : daysLeft <= 7 ? 3 : daysLeft <= 14 ? 2 : 1
  return Math.round(((u * 3) + ((d.weight || 5) * 1.5) + (d.difficulty || 5)) / 5.5 * 10) / 10
}

function dangerColor(score) {
  if (score >= 8) return '#ef4444'
  if (score >= 6) return '#f97316'
  if (score >= 4) return '#fbbf24'
  return '#34d399'
}

function getTimeLeft(dateStr) {
  const diff = new Date(dateStr) - new Date()
  if (diff < 0) {
    const d = Math.floor(Math.abs(diff) / 86400000)
    return { text: 'OVERDUE', sub: d > 0 ? `${d}d ago` : 'today', color: '#ef4444', urgent: true }
  }
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(hours / 24)
  if (hours < 24) return { text: `${hours}h`, sub: 'left', color: '#ef4444', urgent: true }
  if (days <= 2) return { text: `${days}d`, sub: 'left', color: '#f87171', urgent: true }
  if (days <= 5) return { text: `${days}d`, sub: 'left', color: '#fbbf24', urgent: false }
  if (days <= 14) return { text: `${days}d`, sub: 'left', color: '#34d399', urgent: false }
  return { text: `${days}d`, sub: 'left', color: '#475569', urgent: false }
}

// ─── Calendar ─────────────────────────────────────────────────────────────────
function CalendarView({ deadlines, onEdit, onAddForDate }) {
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [dir, setDir] = useState(0) // -1 prev, 1 next

  const todayStr = new Date().toISOString().slice(0, 10)

  const navigate = (d) => {
    setDir(d)
    setMonth(m => new Date(m.getFullYear(), m.getMonth() + d, 1))
  }

  const firstDay = month.getDay()
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const monthKey = `${month.getFullYear()}-${month.getMonth()}`

  const cells = []
  for (let i = 0; i < 42; i++) {
    const d = i - firstDay + 1
    if (d < 1 || d > daysInMonth) { cells.push(null); continue }
    const dateStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, dateStr })
  }

  // Trim trailing empty rows
  while (cells.length > 7 && cells.slice(-7).every(c => c === null)) cells.splice(-7)

  const byDate = {}
  deadlines.forEach(d => {
    const key = d.date?.slice(0, 10)
    if (key) { if (!byDate[key]) byDate[key] = []; byDate[key].push(d) }
  })

  const monthLabel = month.toLocaleDateString('en-US', { month: 'long' })
  const yearLabel = month.getFullYear()

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <motion.button
          whileHover={{ scale: 1.08, background: 'rgba(59,130,246,0.12)' }}
          whileTap={{ scale: 0.93 }}
          onClick={() => navigate(-1)}
          style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
          ‹
        </motion.button>

        <AnimatePresence mode="wait">
          <motion.div key={monthKey}
            initial={{ opacity: 0, y: dir > 0 ? 14 : -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: dir > 0 ? -14 : 14 }}
            transition={{ duration: 0.28, ease }}
            style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(22px,4vw,32px)', fontWeight: 900, letterSpacing: '-0.04em', color: 'white', lineHeight: 1 }}>{monthLabel}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', marginTop: 2 }}>{yearLabel}</div>
          </motion.div>
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.08, background: 'rgba(59,130,246,0.12)' }}
          whileTap={{ scale: 0.93 }}
          onClick={() => navigate(1)}
          style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
          ›
        </motion.button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
        {DAYS_SHORT.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 900, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.2)', paddingBottom: 6 }}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <AnimatePresence mode="wait">
        <motion.div key={monthKey}
          initial={{ opacity: 0, x: dir > 0 ? 40 : -40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir > 0 ? -40 : 40 }}
          transition={{ duration: 0.32, ease }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((cell, i) => {
            if (!cell) return <div key={i} style={{ minHeight: 110 }} />
            const items = byDate[cell.dateStr] || []
            const isToday = cell.dateStr === todayStr
            const isPast = cell.dateStr < todayStr
            const hasUrgent = items.some(d => !d.completed && getDangerScore(d) >= 7)

            return (
              <motion.div key={cell.dateStr}
                whileHover={{ scale: 1.04, background: 'rgba(59,130,246,0.07)', borderColor: 'rgba(59,130,246,0.25)' }}
                onClick={() => onAddForDate(cell.dateStr)}
                style={{
                  minHeight: 110, padding: '7px 6px', borderRadius: 10, cursor: 'pointer',
                  background: isToday ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isToday ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.05)'}`,
                  opacity: isPast && items.length === 0 ? 0.25 : 1,
                  transition: 'background 0.2s, border-color 0.2s, opacity 0.2s',
                  position: 'relative',
                }}>
                {/* Day number */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 4 }}>
                  {isToday ? (
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: 'white', boxShadow: '0 0 12px rgba(59,130,246,0.5)' }}>
                      {cell.day}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>{cell.day}</div>
                  )}
                </div>
                {/* Urgent pulse */}
                {hasUrgent && <div style={{ position: 'absolute', top: 6, left: 6, width: 5, height: 5, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444' }} />}
                {/* Deadline chips */}
                {items.slice(0, 2).map(d => (
                  <motion.div key={d.id}
                    whileHover={{ scale: 1.05 }}
                    onClick={e => { e.stopPropagation(); onEdit(d) }}
                    style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, marginBottom: 2,
                      background: (d.courseColor || '#3b82f6') + '25',
                      color: d.courseColor || '#3b82f6',
                      border: `1px solid ${(d.courseColor || '#3b82f6')}30`,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      textDecoration: d.completed ? 'line-through' : 'none',
                      opacity: d.completed ? 0.35 : 1, cursor: 'pointer',
                    }}>{d.title}</motion.div>
                ))}
                {items.length > 2 && (
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 700, paddingLeft: 2 }}>+{items.length - 2}</div>
                )}
              </motion.div>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Deadline row (urgency queue) ─────────────────────────────────────────────
function DeadlineRow({ d, idx, onComplete, onEdit, onDelete }) {
  const score = getDangerScore(d)
  const dc = dangerColor(score)
  const tl = getTimeLeft(d.date)
  const type = TYPE_CONFIG[d.type] || TYPE_CONFIG.other

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.35, delay: idx * 0.04, ease }}
      whileHover={{ x: 4 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 16px',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderLeft: `3px solid ${d.completed ? 'rgba(255,255,255,0.06)' : dc}`,
        borderRadius: 12,
        opacity: d.completed ? 0.45 : 1,
        cursor: 'pointer',
        transition: 'border-color 0.3s',
        position: 'relative',
        overflow: 'hidden',
      }}>
      {/* Glow for urgent */}
      {score >= 8 && !d.completed && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.03)', pointerEvents: 'none', borderRadius: 12 }} />
      )}

      {/* Checkbox */}
      <motion.button
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.85 }}
        onClick={() => onComplete(d.originalIndex)}
        style={{
          width: 22, height: 22, borderRadius: 7, flexShrink: 0,
          border: `2px solid ${d.completed ? '#34d399' : 'rgba(255,255,255,0.15)'}`,
          background: d.completed ? 'rgba(52,211,153,0.12)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}>
        {d.completed && (
          <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#34d399" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </motion.svg>
        )}
      </motion.button>

      {/* Type chip */}
      <div style={{
        fontSize: 8, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase',
        color: type.color, background: type.color + '18', padding: '3px 7px',
        borderRadius: 5, flexShrink: 0,
      }}>{type.label}</div>

      {/* Title + course */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textDecoration: d.completed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: d.course ? 5 : 0 }}>
          {d.title}
        </div>
        {d.course && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 5, background: `${d.courseColor || '#3b82f6'}18`, border: `1px solid ${d.courseColor || '#3b82f6'}28` }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: d.courseColor || '#3b82f6', flexShrink: 0 }} />
            <span style={{ fontSize: 9, fontWeight: 900, color: d.courseColor || '#3b82f6', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{d.course}</span>
          </div>
        )}
      </div>

      {/* Time left */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: tl.color, letterSpacing: '-0.02em' }}>{tl.text}</div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 600, marginTop: 1 }}>{tl.sub}</div>
      </div>

      {/* Edit / Delete */}
      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={() => onEdit(d.originalIndex)}
          style={{ width: 28, height: 28, borderRadius: 7, background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s' }}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        </motion.button>
        <motion.button whileHover={{ scale: 1.1, color: '#f87171' }} whileTap={{ scale: 0.9 }}
          onClick={() => onDelete(d.originalIndex)}
          style={{ width: 28, height: 28, borderRadius: 7, background: 'none', border: 'none', color: 'rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s' }}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </motion.button>
      </div>
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Deadlines() {
  const { courses } = useCourses()
  const { deadlines, setDeadlines } = useDeadlines()
  const [showForm, setShowForm] = useState(false)
  const [editIndex, setEditIndex] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_DEADLINE })
  const [filter, setFilter] = useState('active')
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const { scrollY } = useScroll()
  const heroOpacity = useTransform(scrollY, [0, 180], [1, 0.6])
  const heroY = useTransform(scrollY, [0, 180], [0, -24])

  // Stats
  const activeCount = deadlines.filter(d => !d.completed).length
  const urgentCount = deadlines.filter(d => !d.completed && getDangerScore(d) >= 7).length
  const completedCount = deadlines.filter(d => d.completed).length

  const handleCourseSelect = (courseId) => {
    if (!courseId) { setForm(f => ({ ...f, courseId: '', courseColor: '', course: '' })); return }
    const c = courses.find(x => x.id === courseId)
    if (c) setForm(f => ({ ...f, courseId: c.id, courseColor: c.color, course: c.code }))
  }

  const sortedDeadlines = useMemo(() => {
    let filtered = [...deadlines]
    if (filter === 'active') filtered = filtered.filter(d => !d.completed)
    else if (filter === 'completed') filtered = filtered.filter(d => d.completed)
    else if (filter === 'urgent') filtered = filtered.filter(d => !d.completed && getDangerScore(d) >= 7)
    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(d => d.title.toLowerCase().includes(q) || (d.course || '').toLowerCase().includes(q))
    }
    return filtered
      .map(d => ({ ...d, originalIndex: deadlines.indexOf(d), dangerScore: getDangerScore(d) }))
      .sort((a, b) => b.dangerScore - a.dangerScore)
  }, [deadlines, filter, search])

  const openAdd = useCallback(() => { setForm({ ...EMPTY_DEADLINE }); setEditIndex(null); setShowForm(true) }, [])
  const openEdit = useCallback((i) => { setForm({ ...deadlines[i] }); setEditIndex(i); setShowForm(true) }, [deadlines])
  const openAddForDate = useCallback((dateStr) => {
    setForm({ ...EMPTY_DEADLINE, date: dateStr + 'T23:59' })
    setEditIndex(null); setShowForm(true)
  }, [])
  const openEditById = useCallback((dl) => {
    const i = deadlines.findIndex(d => d.id === dl.id)
    if (i !== -1) openEdit(i)
  }, [deadlines, openEdit])

  const handleSave = () => {
    if (!form.title || !form.date) return
    if (editIndex !== null) {
      setDeadlines(prev => prev.map((d, i) => i === editIndex ? { ...form } : d))
    } else {
      setDeadlines(prev => [...prev, { ...form }])
    }
    setForm({ ...EMPTY_DEADLINE }); setShowForm(false); setEditIndex(null)
  }
  const handleDelete = (i) => { setDeadlines(prev => prev.filter((_, idx) => idx !== i)); setDeleteConfirm(null) }
  const toggleComplete = (i) => setDeadlines(prev => prev.map((d, idx) => idx === i ? { ...d, completed: !d.completed } : d))

  return (
    <div style={{ background: '#080a0e', minHeight: '100vh', paddingBottom: 120, position: 'relative', fontFamily: 'inherit' }}>
      <style>{`
        @keyframes dl-pulse { 0%,100% { opacity: 0.5; transform: scale(1) } 50% { opacity: 1; transform: scale(1.15) } }
        .dl-row-btn:hover { color: rgba(255,255,255,0.7) !important; }
      `}</style>

      {/* ── AMBIENT GLOW ── */}
      <div style={{ position: 'fixed', top: 0, left: '30%', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(59,130,246,0.06) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '40%', right: '10%', width: 400, height: 400, background: 'radial-gradient(ellipse, rgba(139,92,246,0.04) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 820, margin: '0 auto', padding: '0 20px' }}>

        {/* ── HERO ── */}
        <motion.div style={{ opacity: heroOpacity, y: heroY }} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
          <div style={{ padding: '48px 0 40px' }}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.32em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: 14 }}>
              SCENE 00 — TO-DO
            </motion.div>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.6, ease }}
                style={{ fontSize: 'clamp(42px,8vw,80px)', fontWeight: 900, letterSpacing: '-0.055em', lineHeight: 0.9, color: 'white', margin: 0 }}>
                Your<br /><span style={{ color: 'rgba(255,255,255,0.2)' }}>TO-DO.</span>
              </motion.h1>

              {/* Stat pills */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5, ease }}
                style={{ display: 'flex', gap: 8 }}>
                {[
                  { n: activeCount, label: 'active', color: '#3b82f6' },
                  { n: urgentCount, label: 'urgent', color: '#ef4444' },
                  { n: completedCount, label: 'done', color: '#34d399' },
                ].map(({ n, label, color }) => (
                  <div key={label} style={{ padding: '10px 16px', background: `${color}0d`, border: `1px solid ${color}22`, borderRadius: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color, letterSpacing: '-0.04em', lineHeight: 1 }}>{n}</div>
                    <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{label}</div>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* ── CALENDAR SECTION ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.65, ease }}
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 20,
            padding: '28px 24px',
            marginBottom: 40,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 0 80px rgba(59,130,246,0.05), 0 24px 60px rgba(0,0,0,0.4)',
          }}>
          <CalendarView deadlines={deadlines} onEdit={openEditById} onAddForDate={openAddForDate} />
        </motion.div>

        {/* ── URGENCY QUEUE ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease }}
          whileInView={{ opacity: 1 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap' }}>
              URGENCY QUEUE
            </div>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, rgba(255,255,255,0.06), transparent)' }} />
          </div>

          {/* Filters + search row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 3, gap: 2 }}>
              {[['active', `Active`], ['urgent', `Urgent`], ['completed', 'Done'], ['all', 'All']].map(([f, label]) => (
                <motion.button key={f} whileTap={{ scale: 0.95 }} onClick={() => setFilter(f)} style={{
                  padding: '6px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontSize: 10, fontWeight: 900, letterSpacing: '0.05em', transition: 'all 0.15s',
                  background: filter === f ? 'linear-gradient(135deg, #3b82f6, #06b6d4)' : 'transparent',
                  color: filter === f ? '#fff' : 'rgba(255,255,255,0.3)',
                  boxShadow: filter === f ? '0 0 14px rgba(59,130,246,0.35)' : 'none',
                }}>{label}{f === 'active' ? ` (${activeCount})` : f === 'urgent' ? ` (${urgentCount})` : ''}</motion.button>
              ))}
            </div>

            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: 140 }}>
              <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} width={12} height={12} fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.2)" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, color: 'white', padding: '8px 12px 8px 30px', fontSize: 12, outline: 'none' }} />
            </div>
          </div>

          {/* List */}
          {sortedDeadlines.length === 0 ? (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: 'center', padding: '56px 24px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16 }}>
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.8, repeat: Infinity }}>
                <svg width={40} height={40} fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} style={{ margin: '0 auto 14px', display: 'block' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </motion.div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.2)', marginBottom: 6 }}>
                {search ? 'No results' : filter === 'completed' ? 'Nothing done yet' : 'Clear queue'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.12)', fontWeight: 600 }}>
                {search ? 'Try a different term' : 'Tap + to add a deadline'}
              </div>
            </motion.div>
          ) : (
            <motion.div layout style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <AnimatePresence>
                {sortedDeadlines.map((d, idx) => (
                  <DeadlineRow
                    key={`${d.originalIndex}-${d.id || d.title}`}
                    d={d} idx={idx}
                    onComplete={toggleComplete}
                    onEdit={openEdit}
                    onDelete={(i) => setDeleteConfirm(i)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* ── FAB ── */}
      <motion.button
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 18 }}
        whileHover={{ scale: 1.1, boxShadow: '0 0 36px rgba(59,130,246,0.7), 0 8px 24px rgba(0,0,0,0.5)' }}
        whileTap={{ scale: 0.93 }}
        onClick={openAdd}
        style={{
          position: 'fixed', bottom: 90, right: 20,
          width: 54, height: 54, borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 24px rgba(59,130,246,0.5), 0 4px 16px rgba(0,0,0,0.4)',
          zIndex: 40, color: '#fff',
        }}>
        <svg width={22} height={22} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </motion.button>

      {/* ── ADD / EDIT MODAL ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(8,10,14,0.88)', backdropFilter: 'blur(16px)' }}
            onClick={e => { if (e.target === e.currentTarget) { setShowForm(false); setEditIndex(null) } }}>
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.35, ease }}
              style={{
                width: '100%', maxWidth: 480, maxHeight: '92vh',
                background: '#0d0f14',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '22px 22px 0 0',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
              }}>
              {/* Handle */}
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', margin: '14px auto 0' }} />

              {/* Header */}
              <div style={{ padding: '16px 22px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: 4 }}>
                    {editIndex !== null ? 'EDIT' : 'NEW'} DEADLINE
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: 'white', letterSpacing: '-0.03em' }}>
                    {editIndex !== null ? 'Update deadline' : 'What\'s due?'}
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                  onClick={() => { setShowForm(false); setEditIndex(null) }}
                  style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ✕
                </motion.button>
              </div>

              {/* Body */}
              <div style={{ padding: '18px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  autoFocus placeholder="Assignment title *"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 11, color: 'white', padding: '13px 16px', fontSize: 14, fontWeight: 600, outline: 'none', width: '100%', boxSizing: 'border-box' }} />

                {courses.length > 0 ? (
                  <select value={form.courseId || ''} onChange={e => handleCourseSelect(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 11, color: 'white', padding: '13px 16px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box', appearance: 'none' }}>
                    <option value="" style={{ background: '#0d0f14' }}>No specific course</option>
                    {courses.map(c => <option key={c.id} value={c.id} style={{ background: '#0d0f14' }}>{c.code} — {c.name}</option>)}
                  </select>
                ) : (
                  <input type="text" value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))}
                    placeholder="Course (optional)"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 11, color: 'white', padding: '13px 16px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                )}

                <input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 11, color: 'white', padding: '13px 16px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box', colorScheme: 'dark' }} />

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(TYPE_CONFIG).map(([key, { label, color }]) => (
                    <motion.button key={key} whileTap={{ scale: 0.93 }} onClick={() => setForm(f => ({ ...f, type: key }))}
                      style={{ padding: '7px 14px', borderRadius: 9, cursor: 'pointer', fontSize: 11, fontWeight: 800, transition: 'all 0.15s', background: form.type === key ? `${color}18` : 'rgba(255,255,255,0.03)', color: form.type === key ? color : 'rgba(255,255,255,0.3)', border: `1px solid ${form.type === key ? color + '40' : 'rgba(255,255,255,0.06)'}` }}>
                      {label}
                    </motion.button>
                  ))}
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)' }}>Grade Weight</label>
                    <span style={{ fontSize: 11, fontWeight: 900, color: 'white' }}>{form.weight}/10</span>
                  </div>
                  <input type="range" min="1" max="10" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: +e.target.value }))} style={{ width: '100%', accentColor: '#3b82f6' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)' }}>Difficulty</label>
                    <span style={{ fontSize: 11, fontWeight: 900, color: 'white' }}>{form.difficulty}/10</span>
                  </div>
                  <input type="range" min="1" max="10" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: +e.target.value }))} style={{ width: '100%', accentColor: '#8b5cf6' }} />
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '14px 22px 22px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 10 }}>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setShowForm(false); setEditIndex(null) }}
                  style={{ flex: 1, padding: '14px', borderRadius: 13, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                  Cancel
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={!form.title || !form.date}
                  style={{ flex: 1, padding: '14px', borderRadius: 13, border: 'none', background: !form.title || !form.date ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #3b82f6, #06b6d4)', color: !form.title || !form.date ? 'rgba(255,255,255,0.2)' : 'white', fontSize: 13, fontWeight: 900, cursor: !form.title || !form.date ? 'not-allowed' : 'pointer', boxShadow: !form.title || !form.date ? 'none' : '0 0 20px rgba(59,130,246,0.4)', transition: 'all 0.2s' }}>
                  {editIndex !== null ? 'Save Changes' : 'Add Deadline'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DELETE CONFIRM ── */}
      <AnimatePresence>
        {deleteConfirm !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(8,10,14,0.88)', backdropFilter: 'blur(16px)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ duration: 0.25, ease }}
              style={{ background: '#0d0f14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, width: '100%', maxWidth: 320, padding: '28px 22px', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width={22} height={22} fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: 'white', marginBottom: 8, letterSpacing: '-0.02em' }}>Remove deadline?</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 22, fontWeight: 600, lineHeight: 1.5 }}>
                "{deadlines[deleteConfirm]?.title}" will be permanently removed.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setDeleteConfirm(null)}
                  style={{ flex: 1, padding: '12px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Cancel
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleDelete(deleteConfirm)}
                  style={{ flex: 1, padding: '12px', borderRadius: 11, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>
                  Remove
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
