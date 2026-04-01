import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useCourses } from '../context/CoursesContext'
import { useDeadlines } from '../context/DeadlinesContext'

// ─── Constants ───────────────────────────────────────────────────────────────
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

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  page: {
    background: '#080a0e',
    minHeight: '100vh',
    paddingBottom: 120,
    fontFamily: 'inherit',
    position: 'relative',
  },
  sceneLabel: {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: '#3b82f6',
    marginBottom: 4,
  },
  heading: {
    fontSize: 26,
    fontWeight: 900,
    color: '#f1f5f9',
    letterSpacing: '-0.03em',
    lineHeight: 1.1,
  },
  card: {
    background: '#0d1117',
    border: '1px solid #1e2530',
    borderRadius: 16,
  },
  input: {
    background: '#131922',
    border: '1px solid #1e2530',
    borderRadius: 10,
    color: '#f1f5f9',
    fontSize: 13,
    fontWeight: 600,
    padding: '10px 14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
    WebkitAppearance: 'none',
  },
  select: {
    background: '#131922',
    border: '1px solid #1e2530',
    borderRadius: 10,
    color: '#f1f5f9',
    fontSize: 13,
    fontWeight: 600,
    padding: '10px 14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    cursor: 'pointer',
  },
}

// ─── Danger color ─────────────────────────────────────────────────────────────
function dangerColor(score) {
  if (score >= 8) return '#ef4444'
  if (score >= 6) return '#f97316'
  if (score >= 4) return '#f59e0b'
  return '#22c55e'
}

// ─── Countdown formatter ──────────────────────────────────────────────────────
function getTimeLeft(dateStr) {
  const now = new Date(), due = new Date(dateStr), diff = due - now
  if (diff < 0) {
    const hoursOver = Math.abs(Math.floor(diff / (1000 * 60 * 60)))
    const daysOver = Math.floor(hoursOver / 24)
    return { text: 'OVERDUE', sub: daysOver > 0 ? `${daysOver}d ago` : `${hoursOver}h ago`, color: '#ef4444', urgent: true }
  }
  const totalHours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  if (totalHours < 24) return { text: `${totalHours}h`, sub: 'remaining', color: '#ef4444', urgent: true }
  if (days <= 2) return { text: `${days}d ${hours}h`, sub: 'remaining', color: '#ef4444', urgent: true }
  if (days <= 5) return { text: `${days}`, sub: 'days left', color: '#f59e0b', urgent: false }
  if (days <= 14) return { text: `${days}`, sub: 'days left', color: '#22c55e', urgent: false }
  return { text: `${days}`, sub: 'days left', color: '#475569', urgent: false }
}

// ─── Danger score ─────────────────────────────────────────────────────────────
function getDangerScore(d) {
  if (d.completed) return 0
  const now = new Date(), due = new Date(d.date)
  const daysLeft = Math.max(0, (due - now) / (1000 * 60 * 60 * 24))
  let urgency
  if (daysLeft <= 0) urgency = 10
  else if (daysLeft <= 1) urgency = 9
  else if (daysLeft <= 2) urgency = 8
  else if (daysLeft <= 3) urgency = 7
  else if (daysLeft <= 5) urgency = 5
  else if (daysLeft <= 7) urgency = 3
  else if (daysLeft <= 14) urgency = 2
  else urgency = 1
  return Math.round(((urgency * 3) + (d.weight * 1.5) + (d.difficulty)) / 5.5 * 10) / 10
}

// ─── Notification helpers ─────────────────────────────────────────────────────
function scheduleNotifications(deadlines) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  deadlines.filter(d => !d.completed && d.date).forEach(d => {
    const due = new Date(d.date)
    const now = new Date()
    const msLeft = due - now
    const hoursLeft = msLeft / (1000 * 60 * 60)
    if (hoursLeft > 0 && hoursLeft <= 48) {
      const timeoutMs = Math.max(msLeft - (2 * 60 * 60 * 1000), 500) // notify 2h before due
      if (timeoutMs < msLeft && timeoutMs > 0) {
        setTimeout(() => {
          try {
            new Notification(`CLUTCH — Due Soon: ${d.title}`, {
              body: `${d.course ? d.course + ' · ' : ''}Due in 2 hours`,
              icon: '/favicon.ico',
              tag: `clutch-deadline-${d.title}`,
            })
          } catch (_) {}
        }, timeoutMs)
      }
    }
  })
}

// ─── Timeline view ────────────────────────────────────────────────────────────
function TimelineView({ deadlines }) {
  if (deadlines.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#334155', fontWeight: 700, fontSize: 13 }}>
        No deadlines to display on the timeline.
      </div>
    )
  }

  // Group by week
  const now = new Date()
  const weeks = {}
  deadlines.forEach(d => {
    const due = new Date(d.date)
    const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24))
    const weekNum = diffDays < 0 ? -1 : Math.floor(diffDays / 7)
    const key = weekNum
    if (!weeks[key]) weeks[key] = []
    weeks[key].push(d)
  })

  const weekKeys = Object.keys(weeks).map(Number).sort((a, b) => a - b)

  const weekLabel = (wk) => {
    if (wk < 0) return 'OVERDUE'
    if (wk === 0) return 'THIS WEEK'
    if (wk === 1) return 'NEXT WEEK'
    return `IN ${wk} WEEKS`
  }

  return (
    <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {weekKeys.map(wk => (
        <div key={wk}>
          {/* Week header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              fontSize: 9, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase',
              color: wk < 0 ? '#ef4444' : wk === 0 ? '#f59e0b' : '#334155',
              whiteSpace: 'nowrap',
            }}>
              {weekLabel(wk)}
            </div>
            <div style={{ flex: 1, height: 1, background: '#1e2530' }} />
          </div>
          {/* Timeline track */}
          <div style={{ position: 'relative', paddingLeft: 24 }}>
            {/* Vertical line */}
            <div style={{
              position: 'absolute', left: 8, top: 0, bottom: 0,
              width: 2, background: '#1e2530',
            }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {weeks[wk].map((d, i) => {
                const tl = getTimeLeft(d.date)
                const score = getDangerScore(d)
                const dc = dangerColor(score)
                const type = TYPE_CONFIG[d.type] || TYPE_CONFIG.other
                const dueDate = new Date(d.date)
                const dateStr = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                const timeStr = dueDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                return (
                  <div key={i} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    {/* Dot */}
                    <div style={{
                      position: 'absolute', left: -20, top: 14,
                      width: 8, height: 8, borderRadius: '50%',
                      background: d.completed ? '#334155' : dc,
                      boxShadow: d.completed ? 'none' : `0 0 6px ${dc}80`,
                      flexShrink: 0,
                    }} />
                    <div style={{
                      ...S.card,
                      padding: '12px 14px',
                      flex: 1,
                      borderLeft: `3px solid ${d.completed ? '#1e2530' : (d.courseColor || dc)}`,
                      opacity: d.completed ? 0.4 : 1,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 900, color: '#f1f5f9',
                            textDecoration: d.completed ? 'line-through' : 'none',
                          }}>{d.title}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                            {d.course && <span style={{ fontSize: 10, color: '#475569', fontWeight: 700 }}>{d.course}</span>}
                            <span style={{
                              fontSize: 9, fontWeight: 900, padding: '2px 7px', borderRadius: 6,
                              background: `${type.color}20`, color: type.color,
                            }}>{type.label}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 900, color: tl.color }}>{tl.text}</div>
                          <div style={{ fontSize: 9, color: '#334155', marginTop: 1 }}>{dateStr} {timeStr}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Deadline card ────────────────────────────────────────────────────────────
function DeadlineCard({ d, onComplete, onEdit, onDelete, onSelect, selected, idx }) {
  const [completing, setCompleting] = useState(false)
  const [holdTimer, setHoldTimer] = useState(null)
  const [holdProgress, setHoldProgress] = useState(0)
  const holdIntervalRef = useRef(null)

  const score = getDangerScore(d)
  const dc = dangerColor(score)
  const tl = getTimeLeft(d.date)
  const type = TYPE_CONFIG[d.type] || TYPE_CONFIG.other
  const dueDate = new Date(d.date)
  const dateStr = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const timeStr = dueDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  const handleHoldStart = () => {
    if (d.completed) return
    let progress = 0
    holdIntervalRef.current = setInterval(() => {
      progress += 4
      setHoldProgress(progress)
      if (progress >= 100) {
        clearInterval(holdIntervalRef.current)
        setCompleting(true)
        setTimeout(() => {
          onComplete(d.originalIndex)
          setCompleting(false)
          setHoldProgress(0)
        }, 400)
      }
    }, 25)
  }
  const handleHoldEnd = () => {
    clearInterval(holdIntervalRef.current)
    if (holdProgress < 100) setHoldProgress(0)
  }

  const courseBarColor = d.courseColor || dc

  return (
    <AnimatePresence>
      {!completing && (
        <motion.div
          layout
          initial={{ opacity: 0, y: 14, x: 0 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, x: 80, transition: { duration: 0.3 } }}
          transition={{ delay: idx * 0.04, duration: 0.35, ease }}
          style={{
            ...S.card,
            borderLeft: `4px solid ${d.completed ? '#1e2530' : courseBarColor}`,
            opacity: d.completed ? 0.45 : 1,
            position: 'relative',
            overflow: 'hidden',
            cursor: 'default',
          }}>

          {/* Hold-to-complete progress bar */}
          {holdProgress > 0 && (
            <div style={{
              position: 'absolute', top: 0, left: 0, height: 3,
              width: `${holdProgress}%`, background: '#22c55e',
              transition: 'width 0.025s linear',
              boxShadow: '0 0 8px #22c55e80',
            }} />
          )}

          <div style={{ padding: '14px 14px 12px' }}>
            {/* Row 1: checkbox + title + countdown */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              {/* Checkbox */}
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => onComplete(d.originalIndex)}
                style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                  border: `2px solid ${d.completed ? '#22c55e' : dc}`,
                  background: d.completed ? '#22c55e' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>
                {d.completed && (
                  <svg width={10} height={10} fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </motion.button>

              {/* Batch select */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => onSelect(d.originalIndex)}
                style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 2,
                  border: `1.5px solid ${selected ? '#3b82f6' : '#1e2530'}`,
                  background: selected ? '#3b82f6' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                {selected && (
                  <svg width={8} height={8} fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </motion.button>

              {/* Center content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{
                    fontSize: 14, fontWeight: 900, color: '#f1f5f9',
                    textDecoration: d.completed ? 'line-through' : 'none',
                  }}>{d.title}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 900, padding: '2px 8px', borderRadius: 6,
                    background: `${type.color}20`, color: type.color, flexShrink: 0,
                  }}>{type.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {d.courseColor && (
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: d.courseColor, display: 'inline-block', flexShrink: 0,
                    }} />
                  )}
                  {d.course && <span style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>{d.course}</span>}
                  <span style={{ fontSize: 11, color: '#334155' }}>{dateStr} · {timeStr}</span>
                </div>
              </div>

              {/* Countdown */}
              <div style={{
                textAlign: 'right', flexShrink: 0, minWidth: 52,
                paddingLeft: 8,
              }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: tl.color, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {tl.text}
                </div>
                <div style={{ fontSize: 9, color: '#334155', marginTop: 2, fontWeight: 700, textTransform: 'uppercase' }}>
                  {tl.sub}
                </div>
              </div>
            </div>

            {/* Row 2: danger bar + actions */}
            {!d.completed && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Danger score ring + bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                  {/* Ring */}
                  <svg width={22} height={22} style={{ flexShrink: 0 }}>
                    <circle cx={11} cy={11} r={8} fill="none" stroke="#1e2530" strokeWidth={2.5} />
                    <circle cx={11} cy={11} r={8} fill="none" stroke={dc} strokeWidth={2.5}
                      strokeDasharray={`${2 * Math.PI * 8}`}
                      strokeDashoffset={`${2 * Math.PI * 8 * (1 - score / 10)}`}
                      strokeLinecap="round"
                      transform="rotate(-90 11 11)"
                      style={{ filter: `drop-shadow(0 0 3px ${dc}80)` }}
                    />
                  </svg>
                  {/* Bar */}
                  <div style={{ flex: 1, height: 4, background: '#1e2530', borderRadius: 99, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(score / 10) * 100}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.03, ease }}
                      style={{
                        height: '100%', borderRadius: 99,
                        background: dc,
                        boxShadow: `0 0 6px ${dc}60`,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 900, color: dc, flexShrink: 0, width: 24, textAlign: 'right' }}>
                    {score.toFixed(1)}
                  </span>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {/* Hold-to-complete */}
                  <button
                    onMouseDown={handleHoldStart}
                    onMouseUp={handleHoldEnd}
                    onMouseLeave={handleHoldEnd}
                    onTouchStart={handleHoldStart}
                    onTouchEnd={handleHoldEnd}
                    title="Hold to complete"
                    style={{
                      width: 28, height: 28, borderRadius: 8, border: 'none',
                      background: '#0f1f14', color: '#22c55e',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}>
                    <svg width={12} height={12} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button onClick={() => onEdit(d.originalIndex)} style={{
                    width: 28, height: 28, borderRadius: 8, border: 'none',
                    background: '#131922', color: '#475569',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}>
                    <svg width={12} height={12} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button onClick={() => onDelete(d.originalIndex)} style={{
                    width: 28, height: 28, borderRadius: 8, border: 'none',
                    background: '#1f0f0f', color: '#ef4444',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}>
                    <svg width={12} height={12} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Completed card: just edit + delete */}
            {d.completed && (
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                <button onClick={() => onEdit(d.originalIndex)} style={{
                  width: 26, height: 26, borderRadius: 8, border: 'none',
                  background: '#131922', color: '#475569',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}>
                  <svg width={11} height={11} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button onClick={() => onDelete(d.originalIndex)} style={{
                  width: 26, height: 26, borderRadius: 8, border: 'none',
                  background: '#1f0f0f', color: '#ef4444',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}>
                  <svg width={11} height={11} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Calendar view ────────────────────────────────────────────────────────────
function CalendarView({ deadlines, onEdit, onAddForDate }) {
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const todayStr = new Date().toISOString().slice(0, 10)
  const monthLabel = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const firstDay = month.getDay()
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < 42; i++) {
    const d = i - firstDay + 1
    if (d < 1 || d > daysInMonth) { cells.push(null); continue }
    const dateStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, dateStr })
  }

  const byDate = {}
  deadlines.forEach(d => {
    const key = d.date?.slice(0, 10)
    if (key) { if (!byDate[key]) byDate[key] = []; byDate[key].push(d) }
  })

  return (
    <div style={{ ...S.card, padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          style={{ width: 32, height: 32, borderRadius: 8, background: '#131922', border: '1px solid #1e2530', color: '#f1f5f9', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.02em' }}>{monthLabel}</div>
        <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          style={{ width: 32, height: 32, borderRadius: 8, background: '#131922', border: '1px solid #1e2530', color: '#f1f5f9', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 6 }}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: '#334155', paddingBottom: 4 }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} style={{ minHeight: 72 }} />
          const items = byDate[cell.dateStr] || []
          const isToday = cell.dateStr === todayStr
          const isPast = cell.dateStr < todayStr
          return (
            <div key={i}
              onClick={() => onAddForDate(cell.dateStr)}
              style={{
                minHeight: 72, padding: '5px 4px', cursor: 'pointer', borderRadius: 8,
                background: isToday ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.015)',
                border: `1px solid ${isToday ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.04)'}`,
                opacity: isPast && items.length === 0 ? 0.3 : 1,
                transition: 'background 0.15s',
              }}>
              <div style={{ fontSize: 11, fontWeight: isToday ? 900 : 500, color: isToday ? '#3b82f6' : '#64748b', textAlign: 'right', paddingRight: 2, marginBottom: 3 }}>{cell.day}</div>
              {items.slice(0, 3).map(d => (
                <div key={d.id}
                  onClick={e => { e.stopPropagation(); onEdit(d) }}
                  style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 4px', borderRadius: 3, marginBottom: 2,
                    background: (d.courseColor || '#3b82f6') + '28', color: d.courseColor || '#3b82f6',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    textDecoration: d.completed ? 'line-through' : 'none', opacity: d.completed ? 0.4 : 1, cursor: 'pointer',
                  }}>{d.title}</div>
              ))}
              {items.length > 3 && <div style={{ fontSize: 9, color: '#475569', fontWeight: 700 }}>+{items.length - 3}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Deadlines() {
  const { courses } = useCourses()
  const { deadlines, setDeadlines } = useDeadlines()
  const [showForm, setShowForm] = useState(false)
  const [editIndex, setEditIndex] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_DEADLINE })
  const [filter, setFilter] = useState('active')
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [viewMode, setViewMode] = useState('list') // 'list' | 'timeline'
  const [notifPermission, setNotifPermission] = useState(() => {
    if (typeof Notification === 'undefined') return 'unsupported'
    return Notification.permission
  })
  const [notifBannerDismissed, setNotifBannerDismissed] = useState(() =>
    localStorage.getItem('clutch-notif-dismissed') === '1')
  const [selectedIds, setSelectedIds] = useState(new Set())

  // Schedule notifications on load
  useEffect(() => {
    if (notifPermission === 'granted') scheduleNotifications(deadlines)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const requestNotifications = async () => {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setNotifPermission(result)
    if (result === 'granted') {
      localStorage.setItem('clutch-notif-granted', '1')
      scheduleNotifications(deadlines)
    }
  }

  const dismissNotifBanner = () => {
    setNotifBannerDismissed(true)
    localStorage.setItem('clutch-notif-dismissed', '1')
  }

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
      filtered = filtered.filter(d => d.title.toLowerCase().includes(q) || d.course.toLowerCase().includes(q))
    }
    return filtered
      .map((d, i) => ({ ...d, originalIndex: deadlines.indexOf(d), dangerScore: getDangerScore(d) }))
      .sort((a, b) => b.dangerScore - a.dangerScore)
  }, [deadlines, filter, search])

  const openAdd = () => { setForm({ ...EMPTY_DEADLINE }); setEditIndex(null); setShowForm(true) }
  const openEdit = (i) => { setForm({ ...deadlines[i] }); setEditIndex(i); setShowForm(true) }
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

  const toggleSelect = (i) => setSelectedIds(prev => {
    const next = new Set(prev)
    if (next.has(i)) next.delete(i); else next.add(i)
    return next
  })

  const batchComplete = () => {
    setDeadlines(prev => prev.map((d, i) => selectedIds.has(i) ? { ...d, completed: true } : d))
    setSelectedIds(new Set())
  }
  const batchDelete = () => {
    setDeadlines(prev => prev.filter((_, i) => !selectedIds.has(i)))
    setSelectedIds(new Set())
  }

  const openAddForDate = useCallback((dateStr) => {
    setForm({ ...EMPTY_DEADLINE, date: dateStr + 'T23:59' })
    setEditIndex(null)
    setShowForm(true)
  }, [])

  const openEditById = useCallback((dl) => {
    const i = deadlines.findIndex(d => d.id === dl.id)
    if (i !== -1) openEdit(i)
  }, [deadlines])

  const showNotifBanner = !notifBannerDismissed && notifPermission !== 'granted' && notifPermission !== 'unsupported'

  return (
    <div style={S.page}>
      {/* ── SCENE HEADER ── */}
      <div style={{ padding: '8px 20px 0' }}>
        <div style={S.sceneLabel}>SCENE 00 — DEADLINES</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <h1 style={S.heading}>Deadlines</h1>
          <div style={{ display: 'flex', gap: 12, paddingBottom: 4 }}>
            {[
              { label: `${activeCount} active`, color: '#3b82f6' },
              { label: `${urgentCount} urgent`, color: '#ef4444' },
              { label: `${completedCount} done`, color: '#22c55e' },
            ].map(({ label, color }) => (
              <div key={label} style={{ fontSize: 10, fontWeight: 900, color, letterSpacing: '0.05em' }}>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── NOTIFICATION BANNER ── */}
        <AnimatePresence>
          {showNotifBanner && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                background: '#0f1825',
                border: '1px solid #1e3a5f',
                borderRadius: 14,
                padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: '#1e3a5f',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="#3b82f6" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: '#f1f5f9', marginBottom: 2 }}>
                  Get deadline reminders
                </div>
                <div style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                  We'll notify you 2h before anything due within 48h.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={requestNotifications} style={{
                  background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                  border: 'none', borderRadius: 8, color: '#fff',
                  fontSize: 11, fontWeight: 900, padding: '6px 12px', cursor: 'pointer',
                }}>
                  Enable
                </button>
                <button onClick={dismissNotifBanner} style={{
                  background: '#131922', border: 'none', borderRadius: 8, color: '#475569',
                  fontSize: 11, fontWeight: 700, padding: '6px 10px', cursor: 'pointer',
                }}>
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notification granted confirmation */}
        {notifPermission === 'granted' && (
          <div style={{
            background: '#0f1f14', border: '1px solid #22c55e30', borderRadius: 10,
            padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <svg width={12} height={12} fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e' }}>
              Push notifications active — you'll be alerted 2h before urgent deadlines
            </span>
          </div>
        )}

        {/* ── BATCH ACTIONS ── */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{
                background: '#0f1825', border: '1px solid #1e3a5f', borderRadius: 12,
                padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
              }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: '#3b82f6', flex: 1 }}>
                {selectedIds.size} selected
              </span>
              <button onClick={batchComplete} style={{
                background: '#0f1f14', border: '1px solid #22c55e30', borderRadius: 8,
                color: '#22c55e', fontSize: 11, fontWeight: 900, padding: '6px 12px', cursor: 'pointer',
              }}>
                Complete all
              </button>
              <button onClick={batchDelete} style={{
                background: '#1f0f0f', border: '1px solid #ef444430', borderRadius: 8,
                color: '#ef4444', fontSize: 11, fontWeight: 900, padding: '6px 12px', cursor: 'pointer',
              }}>
                Delete all
              </button>
              <button onClick={() => setSelectedIds(new Set())} style={{
                background: '#131922', border: 'none', borderRadius: 8,
                color: '#475569', fontSize: 11, fontWeight: 700, padding: '6px 10px', cursor: 'pointer',
              }}>
                Clear
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── VIEW TOGGLE ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', background: '#0d1117', border: '1px solid #1e2530', borderRadius: 10, padding: 3, gap: 2 }}>
            {[['list', 'To-Do'], ['calendar', 'Calendar']].map(([mode, label]) => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 900, transition: 'all 0.15s',
                background: viewMode === mode ? 'linear-gradient(135deg, #3b82f6, #06b6d4)' : 'transparent',
                color: viewMode === mode ? '#fff' : '#475569',
                boxShadow: viewMode === mode ? '0 0 10px rgba(59,130,246,0.3)' : 'none',
              }}>{label}</button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 200 }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
              width={13} height={13} fill="none" viewBox="0 0 24 24" stroke="#475569" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...S.input, paddingLeft: 30, paddingTop: 8, paddingBottom: 8, fontSize: 12 }}
              placeholder="Search..." />
          </div>
        </div>

        {/* ── FILTER TABS ── */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            ['active', `Active (${activeCount})`],
            ['urgent', `Urgent (${urgentCount})`],
            ['completed', 'Completed'],
            ['all', 'All'],
          ].map(([f, label]) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '7px 12px', borderRadius: 10, cursor: 'pointer',
              fontSize: 11, fontWeight: 900, transition: 'all 0.15s',
              background: filter === f ? 'linear-gradient(135deg, #3b82f6, #06b6d4)' : '#0d1117',
              color: filter === f ? '#fff' : '#475569',
              boxShadow: filter === f ? '0 0 12px rgba(59,130,246,0.25)' : 'none',
              border: filter !== f ? '1px solid #1e2530' : 'none',
            }}>{label}</button>
          ))}
        </div>

        {/* ── CONTENT ── */}
        {sortedDeadlines.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            style={{ ...S.card, padding: '60px 20px', textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, background: '#131922',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width={28} height={28} fill="none" viewBox="0 0 24 24" stroke="#334155" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#64748b' }}>
              {search ? 'No results found' : filter === 'completed' ? 'Nothing completed yet' : 'No deadlines'}
            </div>
            <div style={{ fontSize: 12, color: '#334155', marginTop: 4, fontWeight: 600 }}>
              {search ? 'Try a different search term' : 'Tap + to add your first deadline'}
            </div>
          </motion.div>
        ) : viewMode === 'calendar' ? (
          <CalendarView deadlines={deadlines} onEdit={openEditById} onAddForDate={openAddForDate} />
        ) : (
          <motion.div layout style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AnimatePresence>
              {sortedDeadlines.map((d, idx) => (
                <DeadlineCard
                  key={`${d.originalIndex}-${d.title}`}
                  d={d}
                  idx={idx}
                  onComplete={toggleComplete}
                  onEdit={openEdit}
                  onDelete={(i) => setDeleteConfirm(i)}
                  onSelect={toggleSelect}
                  selected={selectedIds.has(d.originalIndex)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ── FAB ── */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={openAdd}
        style={{
          position: 'fixed', bottom: 90, right: 20,
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 24px rgba(59,130,246,0.5), 0 4px 16px rgba(0,0,0,0.4)',
          zIndex: 40,
          color: '#fff',
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
            style={{
              position: 'fixed', inset: 0, zIndex: 50,
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              padding: '0 0 0 0',
              background: 'rgba(8,10,14,0.85)',
              backdropFilter: 'blur(12px)',
            }}>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.3, ease }}
              style={{
                ...S.card,
                width: '100%', maxWidth: 480,
                maxHeight: '92vh',
                display: 'flex', flexDirection: 'column',
                borderRadius: '20px 20px 0 0',
              }}>
              {/* Modal header */}
              <div style={{
                padding: '18px 20px 14px', borderBottom: '1px solid #1e2530',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={S.sceneLabel}>{editIndex !== null ? 'EDIT DEADLINE' : 'NEW DEADLINE'}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
                    {editIndex !== null ? 'Update deadline' : 'What\'s due?'}
                  </div>
                </div>
                <button onClick={() => { setShowForm(false); setEditIndex(null) }} style={{
                  width: 32, height: 32, borderRadius: 10, background: '#131922', border: 'none',
                  color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal body */}
              <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Title */}
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#475569', marginBottom: 6 }}>
                    What's due? *
                  </label>
                  <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    style={S.input} placeholder="e.g., ECON 101 Midterm" />
                </div>

                {/* Course */}
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#475569', marginBottom: 6 }}>
                    Course
                  </label>
                  {courses.length > 0 ? (
                    <select value={form.courseId || ''} onChange={e => handleCourseSelect(e.target.value)} style={S.select}>
                      <option value="">No specific course</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))}
                      style={S.input} placeholder="e.g., ECON 101" />
                  )}
                </div>

                {/* Date */}
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#475569', marginBottom: 6 }}>
                    Due Date & Time *
                  </label>
                  <input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    style={S.input} />
                </div>

                {/* Type */}
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#475569', marginBottom: 8 }}>
                    Type
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.entries(TYPE_CONFIG).map(([key, { label, color }]) => (
                      <button key={key} onClick={() => setForm(f => ({ ...f, type: key }))} style={{
                        padding: '6px 12px', borderRadius: 9, cursor: 'pointer',
                        fontSize: 11, fontWeight: 900, transition: 'all 0.15s',
                        background: form.type === key ? `${color}20` : '#131922',
                        color: form.type === key ? color : '#475569',
                        border: `1px solid ${form.type === key ? color + '40' : 'transparent'}`,
                      }}>{label}</button>
                    ))}
                  </div>
                </div>

                {/* Weight */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#475569' }}>
                      Grade Weight
                    </label>
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#f1f5f9' }}>{form.weight}/10</span>
                  </div>
                  <input type="range" min="1" max="10" step="1" value={form.weight}
                    onChange={e => setForm(f => ({ ...f, weight: parseInt(e.target.value) }))}
                    style={{ width: '100%', accentColor: '#3b82f6' }} />
                </div>

                {/* Difficulty */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#475569' }}>
                      Difficulty
                    </label>
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#f1f5f9' }}>{form.difficulty}/10</span>
                  </div>
                  <input type="range" min="1" max="10" step="1" value={form.difficulty}
                    onChange={e => setForm(f => ({ ...f, difficulty: parseInt(e.target.value) }))}
                    style={{ width: '100%', accentColor: '#3b82f6' }} />
                </div>
              </div>

              {/* Modal footer */}
              <div style={{ padding: '14px 20px 20px', borderTop: '1px solid #1e2530', display: 'flex', gap: 10 }}>
                <button onClick={() => { setShowForm(false); setEditIndex(null) }} style={{
                  flex: 1, padding: '13px', borderRadius: 12, border: '1px solid #1e2530',
                  background: '#131922', color: '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={!form.title || !form.date}
                  style={{
                    flex: 1, padding: '13px', borderRadius: 12, border: 'none',
                    background: (!form.title || !form.date)
                      ? '#131922'
                      : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                    color: (!form.title || !form.date) ? '#334155' : '#fff',
                    fontSize: 13, fontWeight: 900, cursor: (!form.title || !form.date) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: (!form.title || !form.date) ? 'none' : '0 0 16px rgba(59,130,246,0.35)',
                  }}>
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
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 50,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
              background: 'rgba(8,10,14,0.85)', backdropFilter: 'blur(12px)',
            }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, ease }}
              style={{ ...S.card, width: '100%', maxWidth: 320, padding: '24px 20px', textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, background: 'rgba(239,68,68,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
              }}>
                <svg width={22} height={22} fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#f1f5f9', marginBottom: 6 }}>Delete deadline?</div>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 20, fontWeight: 600 }}>
                "{deadlines[deleteConfirm]?.title}" will be permanently removed.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setDeleteConfirm(null)} style={{
                  flex: 1, padding: '11px', borderRadius: 10, border: '1px solid #1e2530',
                  background: '#131922', color: '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>Cancel</button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => handleDelete(deleteConfirm)} style={{
                  flex: 1, padding: '11px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)',
                  background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                  fontSize: 13, fontWeight: 900, cursor: 'pointer',
                }}>Delete</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
