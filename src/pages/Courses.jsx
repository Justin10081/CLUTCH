import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useCourses } from '../context/CoursesContext'
import { useDeadlines } from '../context/DeadlinesContext'
import { extractTextFromFile, parseSyllabus, syllabusToDeadlines } from '../utils/syllabusParser'

const COURSE_COLORS = [
  '#3b82f6', '#06b6d4', '#22c55e', '#10b981',
  '#f59e0b', '#f97316', '#f43f5e', '#8b5cf6',
]

const EMPTY_FORM = {
  name: '', code: '', professor: '', credits: 3,
  color: '#3b82f6', semester: '', targetGrade: 'B+',
}

const ease = [0.16, 1, 0.3, 1]

// Cinematic label above each input
function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 800, letterSpacing: '0.22em',
      textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)',
      marginBottom: 8,
    }}>
      {children}
    </div>
  )
}

// Dark cinematic input
function CinemaInput({ style, ...props }) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        color: 'white',
        padding: '11px 14px',
        fontSize: 13,
        fontWeight: 500,
        outline: 'none',
        transition: 'border-color 0.2s, background 0.2s',
        boxSizing: 'border-box',
        ...style,
      }}
      onFocus={e => {
        e.target.style.borderColor = 'rgba(59,130,246,0.5)'
        e.target.style.background = 'rgba(59,130,246,0.06)'
      }}
      onBlur={e => {
        e.target.style.borderColor = 'rgba(255,255,255,0.08)'
        e.target.style.background = 'rgba(255,255,255,0.04)'
      }}
    />
  )
}

// Dark cinematic select
function CinemaSelect({ style, ...props }) {
  return (
    <select
      {...props}
      style={{
        width: '100%',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        color: 'white',
        padding: '11px 14px',
        fontSize: 13,
        fontWeight: 500,
        outline: 'none',
        appearance: 'none',
        cursor: 'none',
        boxSizing: 'border-box',
        ...style,
      }}
    />
  )
}

export default function Courses() {
  const { courses, addCourse, updateCourse, deleteCourse } = useCourses()
  const { deadlines: allDeadlines, replaceCourseSyllabusDeadlines, removeDeadlinesByCourse } = useDeadlines()
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [syllabusFile, setSyllabusFile] = useState(null) // stores raw File object
  const [parsing, setParsing] = useState(false)
  const [parseStep, setParseStep] = useState(-1) // -1=idle, 0-3=steps, 4=done, 5=error
  const [parseMsg, setParseMsg] = useState('')
  const [hoveredCard, setHoveredCard] = useState(null)
  const syllabusRef = useRef()

  const openAdd = () => {
    setForm({ ...EMPTY_FORM })
    setEditId(null)
    setSyllabusFile(null)
    setParseStep(-1)
    setParseMsg('')
    setParsing(false)
    setShowModal(true)
  }

  const openEdit = (course) => {
    setForm({
      name: course.name, code: course.code, professor: course.professor || '',
      credits: course.credits, color: course.color, semester: course.semester || '',
      targetGrade: course.targetGrade || 'B+',
    })
    setEditId(course.id)
    setSyllabusFile(null)
    setParseStep(-1)
    setParseMsg('')
    setParsing(false)
    setShowModal(true)
  }

  const handleSyllabusUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSyllabusFile(file) // store raw File — parsed on save
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) return

    let course
    if (editId) {
      updateCourse(editId, { ...form })
      course = { id: editId, ...form }
    } else {
      course = await addCourse({ ...form })
    }

    if (!syllabusFile) {
      setShowModal(false)
      setEditId(null)
      return
    }

    // Keep modal open — show live parse progress
    const fileToProcess = syllabusFile
    setSyllabusFile(null)
    setParsing(true)
    setParseStep(0)
    setParseMsg('Extracting text from file...')

    try {
      const text = await extractTextFromFile(fileToProcess)

      setParseStep(1)
      setParseMsg('Reading course structure...')
      const onStep = (msg) => { setParseMsg(msg); setParseStep(s => Math.min(s + 1, 2)) }
      const parsed = await parseSyllabus(text, course.name, course.code, onStep)

      setParseStep(2)
      setParseMsg('Saving to your account...')
      await updateCourse(course.id, { syllabusName: fileToProcess.name, syllabusData: parsed })
      const newDeadlines = syllabusToDeadlines(parsed, course.id, course.name, course.code, course.color)
      if (newDeadlines.length > 0) replaceCourseSyllabusDeadlines(course.id, newDeadlines)

      setParseStep(3)
      setParseMsg(`Done! ${newDeadlines.length} deadline${newDeadlines.length !== 1 ? 's' : ''} imported.`)
      setTimeout(() => {
        setParsing(false)
        setParseStep(-1)
        setShowModal(false)
        setEditId(null)
      }, 1600)
    } catch (err) {
      console.error('Syllabus parse error:', err)
      setParseStep(5)
      setParseMsg(err.message || 'Failed to parse. Try a .txt or .md version.')
    }
  }

  const getUpcomingCount = (courseId) => {
    const now = new Date()
    return allDeadlines.filter(d =>
      !d.completed && d.courseId === courseId && new Date(d.date) >= now
    ).length
  }

  return (
    <div style={{ minHeight: '100vh', padding: '0 0 80px 0' }}>

      {/* ── PAGE HERO ── */}
      <div style={{ padding: '48px 48px 40px', position: 'relative' }}>
        {/* Ambient glow behind heading */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 200,
          background: 'radial-gradient(ellipse at 30% 0%, rgba(59,130,246,0.08) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          style={{ position: 'relative' }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginBottom: 12 }}>
            SCENE 01 — COURSE HUB
          </div>
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-0.045em',
            lineHeight: 1.0, color: 'white', margin: 0,
          }}>
            {courses.length === 0 ? 'Your Semester.' : `${courses.length} Course${courses.length !== 1 ? 's' : ''}`}
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 10, fontWeight: 500 }}>
            {courses.length === 0 ? 'Start building your story.' : `${courses.reduce((s, c) => s + (c.credits || 0), 0)} credits total this semester`}
          </p>
        </motion.div>
      </div>

      {/* ── EMPTY STATE ── */}
      {courses.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: '50vh', textAlign: 'center', padding: '0 48px',
          }}>
          {/* Cinematic title */}
          <div style={{ marginBottom: 48 }}>
            <div style={{
              fontSize: 'clamp(48px, 8vw, 96px)', fontWeight: 900, letterSpacing: '-0.05em',
              lineHeight: 0.92, color: 'rgba(255,255,255,0.06)',
              userSelect: 'none',
            }}>
              YOUR<br />SEMESTER.<br />YOUR STORY.
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', marginBottom: 36, maxWidth: 320, lineHeight: 1.7, fontWeight: 400 }}>
            Add your courses and upload your syllabus. Clutch will auto-populate your deadlines and study engine.
          </p>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={openAdd}
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
              border: 'none', borderRadius: 999, padding: '14px 36px',
              fontSize: 11, fontWeight: 800, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: 'white', cursor: 'none',
              boxShadow: '0 0 40px rgba(59,130,246,0.3)',
            }}>
            + Add First Course
          </motion.button>
        </motion.div>
      )}

      {/* ── FILM POSTER GRID ── */}
      {courses.length > 0 && (
        <div style={{ padding: '0 48px' }}>
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
            style={{
              display: 'flex', flexWrap: 'wrap', gap: 20,
              alignItems: 'flex-start',
            }}>

            {courses.map((course) => {
              const upcoming = getUpcomingCount(course.id)
              const isHovered = hoveredCard === course.id

              return (
                <motion.div
                  key={course.id}
                  variants={{ hidden: { opacity: 0, y: 32 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } }}
                  onHoverStart={() => setHoveredCard(course.id)}
                  onHoverEnd={() => setHoveredCard(null)}
                  style={{ position: 'relative', flexShrink: 0 }}>

                  {/* Film poster card */}
                  <motion.div
                    animate={{
                      y: isHovered ? -6 : 0,
                      boxShadow: isHovered
                        ? `0 24px 60px rgba(0,0,0,0.6), 0 0 40px ${course.color}22`
                        : '0 4px 20px rgba(0,0,0,0.4)',
                    }}
                    transition={{ duration: 0.35, ease }}
                    style={{
                      width: 220, height: 310,
                      borderRadius: 16,
                      background: '#0d0f14',
                      border: '1px solid rgba(255,255,255,0.07)',
                      overflow: 'hidden',
                      position: 'relative',
                      cursor: 'none',
                    }}>

                    {/* Top atmospheric glow — course color */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: '55%',
                      background: `radial-gradient(ellipse at 50% 0%, ${course.color}28 0%, transparent 70%)`,
                      pointerEvents: 'none',
                    }} />

                    {/* Course color stripe at top */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                      background: `linear-gradient(90deg, ${course.color}, ${course.color}55)`,
                    }} />

                    {/* Course code — top left badge */}
                    <div style={{
                      position: 'absolute', top: 18, left: 18,
                      fontSize: 9, fontWeight: 900, letterSpacing: '0.2em',
                      textTransform: 'uppercase', color: course.color,
                    }}>
                      {course.code}
                    </div>

                    {/* Upcoming count badge */}
                    {upcoming > 0 && (
                      <div style={{
                        position: 'absolute', top: 14, right: 14,
                        background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 999, padding: '3px 8px',
                        fontSize: 9, fontWeight: 900, color: '#f87171', letterSpacing: '0.05em',
                      }}>
                        {upcoming} DUE
                      </div>
                    )}

                    {/* Syllabus indicator */}
                    {course.syllabus && (
                      <div style={{
                        position: 'absolute', top: upcoming > 0 ? 44 : 14, right: 14,
                        width: 6, height: 6, borderRadius: '50%',
                        background: '#22c55e',
                        boxShadow: '0 0 8px rgba(34,197,94,0.6)',
                      }} />
                    )}

                    {/* Bottom content area */}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      padding: '0 18px 20px',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
                    }}>
                      {/* Professor */}
                      {course.professor && (
                        <div style={{
                          fontSize: 9, fontWeight: 600, letterSpacing: '0.12em',
                          textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)',
                          marginBottom: 6,
                        }}>
                          {course.professor}
                        </div>
                      )}

                      {/* Course name — big type */}
                      <div style={{
                        fontSize: 17, fontWeight: 900, letterSpacing: '-0.03em',
                        lineHeight: 1.1, color: 'white',
                        marginBottom: 10,
                      }}>
                        {course.name}
                      </div>

                      {/* Credits + semester */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                          textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
                          background: 'rgba(255,255,255,0.06)', borderRadius: 4,
                          padding: '3px 7px',
                        }}>
                          {course.credits} CR
                        </span>
                        {course.semester && (
                          <span style={{
                            fontSize: 9, color: 'rgba(255,255,255,0.22)',
                            fontWeight: 600, letterSpacing: '0.08em',
                          }}>
                            {course.semester}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Hover overlay — actions */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(8,10,14,0.82)',
                            backdropFilter: 'blur(4px)',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: 12,
                          }}>
                          {/* View course */}
                          <Link to={`/courses/${course.id}`} style={{ textDecoration: 'none', cursor: 'none', width: '70%' }}>
                            <motion.div
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.97 }}
                              style={{
                                background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                                borderRadius: 8, padding: '10px 0',
                                fontSize: 10, fontWeight: 800, letterSpacing: '0.18em',
                                textTransform: 'uppercase', color: 'white',
                                textAlign: 'center',
                              }}>
                              Open Course
                            </motion.div>
                          </Link>

                          {/* Edit */}
                          <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={(e) => { e.stopPropagation(); openEdit(course) }}
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 8, padding: '10px 0',
                              width: '70%',
                              fontSize: 10, fontWeight: 700, letterSpacing: '0.15em',
                              textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)',
                              cursor: 'none',
                            }}>
                            Edit
                          </motion.button>

                          {/* Delete */}
                          <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(course.id) }}
                            style={{
                              background: 'rgba(239,68,68,0.08)',
                              border: '1px solid rgba(239,68,68,0.18)',
                              borderRadius: 8, padding: '8px 0',
                              width: '70%',
                              fontSize: 9, fontWeight: 700, letterSpacing: '0.15em',
                              textTransform: 'uppercase', color: 'rgba(248,113,113,0.7)',
                              cursor: 'none',
                            }}>
                            Remove
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
              )
            })}

            {/* ── ADD COURSE POSTER CARD ── */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 32 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } }}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.35, ease }}>
              <motion.button
                onClick={openAdd}
                style={{
                  width: 220, height: 310,
                  borderRadius: 16,
                  background: 'transparent',
                  border: '1px dashed rgba(255,255,255,0.1)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 14, cursor: 'none',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                whileHover={{
                  borderColor: 'rgba(59,130,246,0.4)',
                  backgroundColor: 'rgba(59,130,246,0.04)',
                }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.22em',
                  textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)',
                }}>
                  Add Course
                </div>
              </motion.button>
            </motion.div>

          </motion.div>
        </div>
      )}

      {/* ── ADD / EDIT MODAL ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '20px',
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
            onClick={(e) => { if (!parsing && e.target === e.currentTarget) setShowModal(false) }}>

            <style>{`@keyframes courses-spin { to { transform: rotate(360deg) } }`}</style>
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ duration: 0.38, ease }}
              style={{
                background: '#0d0f14',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20,
                width: '100%', maxWidth: 480,
                maxHeight: '90vh',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 40px 120px rgba(0,0,0,0.8)',
              }}>

              {/* Modal header — clapperboard style */}
              <div style={{
                padding: '24px 28px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                background: 'linear-gradient(to bottom, rgba(59,130,246,0.05), transparent)',
                flexShrink: 0,
              }}>
                <div>
                  <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginBottom: 6 }}>
                    PRODUCTION — {editId ? 'EDIT SCENE' : 'NEW SCENE'}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.04em', color: 'white' }}>
                    {editId ? 'Edit Course' : 'Add Course'}
                  </div>
                </div>
                {!parsing && (
                  <button
                    onClick={() => setShowModal(false)}
                    style={{
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8, width: 32, height: 32,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'rgba(255,255,255,0.4)', cursor: 'none',
                      fontSize: 16, lineHeight: 1,
                    }}>
                    ✕
                  </button>
                )}
              </div>

              {/* Modal body — parse progress overlay */}
              {parsing && (
                <div style={{ padding: '32px 28px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                    {parseStep < 3 ? (
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        border: '2.5px solid transparent',
                        borderTopColor: '#3b82f6', borderRightColor: '#3b82f6',
                        animation: 'courses-spin 1s linear infinite',
                      }} />
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>✓</div>
                    )}
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                      {parseStep === 5 ? 'Parse failed' : parseMsg || 'Working...'}
                    </span>
                  </div>
                  {[
                    { label: 'Extracting text from file' },
                    { label: 'Reading course structure' },
                    { label: 'Organizing assignments & deadlines' },
                    { label: 'Saving to your account' },
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: i <= parseStep ? 1 : 0.25, transition: 'opacity 0.3s' }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        background: i < parseStep ? 'rgba(34,197,94,0.15)' : i === parseStep ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1.5px solid ${i < parseStep ? 'rgba(34,197,94,0.5)' : i === parseStep ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.1)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, color: i < parseStep ? '#4ade80' : '#3b82f6',
                      }}>
                        {i < parseStep ? '✓' : i + 1}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: i <= parseStep ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)' }}>
                        {s.label}
                      </span>
                    </div>
                  ))}
                  {parseStep === 5 && (
                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '12px 16px', fontSize: 12, color: '#f87171' }}>
                      {parseMsg || 'Could not parse syllabus. Try a .txt or .pdf file.'}
                      <button onClick={() => { setParsing(false); setParseStep(-1); setShowModal(false); setEditId(null) }}
                        style={{ marginLeft: 12, background: 'none', border: 'none', color: '#f87171', textDecoration: 'underline', cursor: 'none', fontSize: 12 }}>
                        Close
                      </button>
                    </div>
                  )}
                </div>
              )}
              {/* Modal body — form fields */}
              <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, display: parsing ? 'none' : 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Color picker */}
                <div>
                  <FieldLabel>Signal Color</FieldLabel>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {COURSE_COLORS.map(c => (
                      <motion.button
                        key={c}
                        whileTap={{ scale: 0.88 }}
                        onClick={() => setForm(f => ({ ...f, color: c }))}
                        style={{
                          width: 30, height: 30, borderRadius: 8, background: c,
                          border: form.color === c ? `2px solid white` : '2px solid transparent',
                          outline: form.color === c ? `2px solid ${c}` : 'none',
                          outlineOffset: 2,
                          boxShadow: form.color === c ? `0 0 16px ${c}66` : 'none',
                          cursor: 'none', transition: 'all 0.15s',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Name + Code row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <FieldLabel>Course Name *</FieldLabel>
                    <CinemaInput
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Introduction to CS"
                    />
                  </div>
                  <div>
                    <FieldLabel>Course Code *</FieldLabel>
                    <CinemaInput
                      type="text"
                      value={form.code}
                      onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                      placeholder="CS 101"
                    />
                  </div>
                </div>

                {/* Professor */}
                <div>
                  <FieldLabel>Professor</FieldLabel>
                  <CinemaInput
                    type="text"
                    value={form.professor}
                    onChange={e => setForm(f => ({ ...f, professor: e.target.value }))}
                    placeholder="Dr. Smith"
                  />
                </div>

                {/* Credits + Target Grade row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <FieldLabel>Credits</FieldLabel>
                    <CinemaSelect
                      value={form.credits}
                      onChange={e => setForm(f => ({ ...f, credits: parseInt(e.target.value) }))}>
                      {[1,2,3,4,5,6].map(n => <option key={n} value={n} style={{ background: '#0d0f14' }}>{n} credit{n !== 1 ? 's' : ''}</option>)}
                    </CinemaSelect>
                  </div>
                  <div>
                    <FieldLabel>Target Grade</FieldLabel>
                    <CinemaSelect
                      value={form.targetGrade}
                      onChange={e => setForm(f => ({ ...f, targetGrade: e.target.value }))}>
                      {['A+','A','A-','B+','B','B-','C+','C','C-','D+','D'].map(g => (
                        <option key={g} value={g} style={{ background: '#0d0f14' }}>{g}</option>
                      ))}
                    </CinemaSelect>
                  </div>
                </div>

                {/* Semester */}
                <div>
                  <FieldLabel>Semester</FieldLabel>
                  <CinemaInput
                    type="text"
                    value={form.semester}
                    onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
                    placeholder="Spring 2026"
                  />
                </div>

                {/* Syllabus upload */}
                <div>
                  <FieldLabel>
                    Syllabus Upload
                    <span style={{ fontWeight: 400, opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}> — AI auto-imports deadlines</span>
                  </FieldLabel>
                  <input type="file" ref={syllabusRef} accept=".txt,.md,.pdf,.docx"
                    style={{ display: 'none' }} onChange={handleSyllabusUpload} />

                  {syllabusFile ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)',
                      borderRadius: 8, padding: '12px 14px',
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.6)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'rgba(74,222,128,0.8)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {syllabusFile.name}
                      </span>
                      <button onClick={() => setSyllabusFile(null)}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'none', fontSize: 12 }}>
                        ✕
                      </button>
                    </div>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => syllabusRef.current?.click()}
                      style={{
                        width: '100%', padding: '20px',
                        border: '1px dashed rgba(255,255,255,0.1)',
                        borderRadius: 8, background: 'rgba(255,255,255,0.02)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                        cursor: 'none', transition: 'border-color 0.2s, background 0.2s',
                      }}
                      whileHover={{
                        borderColor: 'rgba(59,130,246,0.4)',
                        backgroundColor: 'rgba(59,130,246,0.04)',
                      }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)' }}>
                        Upload Syllabus
                      </span>
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Modal footer — hidden while parsing */}
              <div style={{
                padding: '20px 28px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                display: parsing ? 'none' : 'flex', gap: 10, flexShrink: 0,
                background: 'rgba(0,0,0,0.2)',
              }}>
                {editId && (
                  <button
                    onClick={() => { setDeleteConfirm(editId); setShowModal(false) }}
                    style={{
                      background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)',
                      borderRadius: 10, padding: '12px 16px',
                      fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
                      textTransform: 'uppercase', color: '#f87171', cursor: 'none',
                    }}>
                    Delete
                  </button>
                )}
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: '12px',
                    fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
                    textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', cursor: 'none',
                  }}>
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  disabled={!form.name.trim() || !form.code.trim()}
                  style={{
                    flex: 1,
                    background: (!form.name.trim() || !form.code.trim())
                      ? 'rgba(59,130,246,0.2)'
                      : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                    border: 'none', borderRadius: 10, padding: '12px',
                    fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
                    textTransform: 'uppercase', color: 'white', cursor: 'none',
                    opacity: (!form.name.trim() || !form.code.trim()) ? 0.4 : 1,
                    boxShadow: (!form.name.trim() || !form.code.trim()) ? 'none' : '0 0 20px rgba(59,130,246,0.3)',
                  }}>
                  {editId ? 'Save Changes' : syllabusFile ? 'Add & Parse Syllabus' : 'Add Course'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DELETE CONFIRMATION ── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 400,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
              background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.25, ease }}
              style={{
                background: '#0d0f14', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 18, padding: '36px 32px',
                maxWidth: 320, width: '100%', textAlign: 'center',
                boxShadow: '0 0 60px rgba(239,68,68,0.1)',
              }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(248,113,113,0.5)', marginBottom: 10 }}>
                CONFIRM DELETE
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.03em', color: 'white', marginBottom: 8 }}>
                {courses.find(c => c.id === deleteConfirm)?.name}
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 28, lineHeight: 1.6 }}>
                This course and all associated data will be permanently removed.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: '12px',
                    fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
                    textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', cursor: 'none',
                  }}>
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { deleteCourse(deleteConfirm); removeDeadlinesByCourse(deleteConfirm); setDeleteConfirm(null) }}
                  style={{
                    flex: 1, background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: 10, padding: '12px',
                    fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
                    textTransform: 'uppercase', color: '#f87171', cursor: 'none',
                  }}>
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
