import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGPA } from '../context/GPAContext'

// ─── Grade scale ────────────────────────────────────────────────────────────
const GRADE_SCALE = [
  { label: 'A+', value: 4.0, min: 97 },
  { label: 'A',  value: 4.0, min: 93 },
  { label: 'A-', value: 3.7, min: 90 },
  { label: 'B+', value: 3.3, min: 87 },
  { label: 'B',  value: 3.0, min: 83 },
  { label: 'B-', value: 2.7, min: 80 },
  { label: 'C+', value: 2.3, min: 77 },
  { label: 'C',  value: 2.0, min: 73 },
  { label: 'C-', value: 1.7, min: 70 },
  { label: 'D+', value: 1.3, min: 67 },
  { label: 'D',  value: 1.0, min: 63 },
  { label: 'D-', value: 0.7, min: 60 },
  { label: 'F',  value: 0.0, min: 0  },
]

function percentToGPA(pct) {
  for (const g of GRADE_SCALE) { if (pct >= g.min) return g.value }
  return 0
}
function percentToLetter(pct) {
  for (const g of GRADE_SCALE) { if (pct >= g.min) return g.label }
  return 'F'
}
function letterToGPA(letter) {
  const entry = GRADE_SCALE.find(g => g.label === letter)
  return entry ? entry.value : null
}
function gpaToLetter(gpa) {
  return GRADE_SCALE.reduce((prev, curr) =>
    Math.abs(curr.value - gpa) < Math.abs(prev.value - gpa) ? curr : prev
  ).label
}
function gpaColor(gpa) {
  if (gpa >= 3.5) return '#22c55e'
  if (gpa >= 2.5) return '#f59e0b'
  if (gpa >= 1.0) return '#f97316'
  return '#ef4444'
}
function gradeColor(pct) {
  if (pct >= 80) return '#22c55e'
  if (pct >= 60) return '#f59e0b'
  return '#ef4444'
}

const EMPTY_COURSE = {
  name: '',
  code: '',
  currentGrade: 75,
  finalWeight: 30,
  finalScore: 70,
  credits: 3,
  actualGrade: null,   // letter grade entered after completing
  targetGrade: 'B+',   // letter grade target
}

const SEMESTER_LABEL = (() => {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  if (month >= 8) return `Fall ${year}`
  if (month >= 5) return `Summer ${year}`
  return `Spring ${year}`
})()

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  page: {
    background: '#080a0e',
    minHeight: '100vh',
    padding: '0 0 120px 0',
    fontFamily: 'inherit',
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
  subheading: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    fontWeight: 600,
  },
  card: {
    background: '#0d1117',
    border: '1px solid #1e2530',
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: '#334155',
    marginBottom: 12,
    paddingLeft: 2,
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
  },
  btn: {
    background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 900,
    padding: '12px 20px',
    transition: 'opacity 0.15s, transform 0.1s',
  },
  btnGhost: {
    background: '#131922',
    border: '1px solid #1e2530',
    borderRadius: 12,
    color: '#64748b',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 700,
    padding: '12px 20px',
    transition: 'background 0.2s',
  },
}

// ─── Sparkline component ─────────────────────────────────────────────────────
function Sparkline({ data, width = 120, height = 32 }) {
  if (!data || data.length < 2) return null
  const min = Math.min(...data, 0)
  const max = Math.max(...data, 4)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  }).join(' ')
  const lastColor = gpaColor(data[data.length - 1])
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={lastColor} strokeWidth={2}
        strokeLinejoin="round" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${lastColor}80)` }} />
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * width
        const y = height - ((v - min) / range) * height
        return <circle key={i} cx={x} cy={y} r={3} fill={gpaColor(v)} />
      })}
    </svg>
  )
}

// ─── Big circular GPA gauge ──────────────────────────────────────────────────
function GPAGauge({ gpa }) {
  const size = 180
  const strokeW = 12
  const r = (size / 2) - strokeW
  // Arc: 220 degrees (starting -200deg from top going clockwise)
  const arcDeg = 240
  const startAngle = -210
  const circ = 2 * Math.PI * r
  const arcLen = (arcDeg / 360) * circ
  const pct = Math.min(gpa / 4, 1)
  const fill = pct * arcLen
  const color = gpaColor(gpa)
  const toRad = d => (d * Math.PI) / 180
  const cx = size / 2
  const cy = size / 2
  // Convert angle to point on circle
  const pt = (deg) => ({
    x: cx + r * Math.cos(toRad(deg)),
    y: cy + r * Math.sin(toRad(deg)),
  })
  const endAngle = startAngle + arcDeg
  const s = pt(startAngle)
  const e = pt(endAngle)
  const largeArc = arcDeg > 180 ? 1 : 0
  const trackPath = `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`
  const fillE = pt(startAngle + pct * arcDeg)
  const fillLarge = pct * arcDeg > 180 ? 1 : 0
  const fillPath = `M ${s.x} ${s.y} A ${r} ${r} 0 ${fillLarge} 1 ${fillE.x} ${fillE.y}`

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        {/* Track */}
        <path d={trackPath} fill="none" stroke="#1e2530" strokeWidth={strokeW} strokeLinecap="round" />
        {/* Fill */}
        <motion.path
          d={fillPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
        {/* Min/max labels */}
        <text x={s.x - 6} y={s.y + 16} fill="#334155" fontSize="10" fontWeight="700" textAnchor="middle">0.0</text>
        <text x={e.x + 6} y={e.y + 16} fill="#334155" fontSize="10" fontWeight="700" textAnchor="middle">4.0</text>
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        paddingTop: 16,
      }}>
        <div style={{ fontSize: 42, fontWeight: 900, color, letterSpacing: '-0.04em', lineHeight: 1 }}>
          {gpa.toFixed(2)}
        </div>
        <div style={{ fontSize: 13, color: '#475569', fontWeight: 700, marginTop: 2 }}>/ 4.0</div>
        <div style={{ fontSize: 11, color, fontWeight: 900, marginTop: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {gpaToLetter(gpa)}
        </div>
        <div style={{ fontSize: 10, color: '#334155', fontWeight: 700, marginTop: 2 }}>
          {gpa >= 3.7 ? "Dean's List" : gpa >= 3.0 ? 'On Track' : gpa >= 2.0 ? 'Passing' : 'Needs Work'}
        </div>
      </div>
    </div>
  )
}

// ─── Scenario bar ────────────────────────────────────────────────────────────
function ScenarioBar({ worst, current, best }) {
  const scenarios = [
    { label: 'WORST CASE', gpa: worst, note: 'All finals → 50%' },
    { label: 'CURRENT',    gpa: current, note: 'Projected trajectory', highlight: true },
    { label: 'BEST CASE',  gpa: best, note: 'All finals → 100%' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: '#1e2530', borderRadius: 14, overflow: 'hidden' }}>
      {scenarios.map(({ label, gpa, note, highlight }) => (
        <div key={label} style={{
          background: highlight ? '#0f1825' : '#0d1117',
          padding: '14px 12px',
          textAlign: 'center',
          position: 'relative',
        }}>
          {highlight && (
            <div style={{
              position: 'absolute', top: 0, left: '20%', right: '20%', height: 2,
              background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)',
            }} />
          )}
          <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#334155', marginBottom: 4 }}>
            {label}
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: gpaColor(gpa), letterSpacing: '-0.03em', lineHeight: 1 }}>
            {gpa.toFixed(2)}
          </div>
          <div style={{ fontSize: 9, color: '#334155', marginTop: 3, fontWeight: 600 }}>{note}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Grade scale reference ───────────────────────────────────────────────────
function GradeScaleRef() {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ ...S.card }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#f1f5f9', letterSpacing: '0.05em' }}>
            GRADE SCALE REFERENCE
          </div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 2, fontWeight: 600 }}>
            Letter grades → GPA points
          </div>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="#475569" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}>
            <div style={{ borderTop: '1px solid #1e2530', padding: '14px 18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {GRADE_SCALE.map(g => (
                  <div key={g.label} style={{
                    background: '#131922', borderRadius: 8, padding: '7px 8px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: gradeColor(g.min) }}>{g.label}</div>
                    <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, marginTop: 1 }}>{g.value.toFixed(1)}</div>
                    <div style={{ fontSize: 9, color: '#334155', marginTop: 1 }}>{g.min}%+</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Course row ──────────────────────────────────────────────────────────────
function CourseRow({ course, index, onUpdate, onRemove, targetGPA, cumulativeGPA, cumulativeCredits, allCourses, getProjectedGrade }) {
  const [editingTarget, setEditingTarget] = useState(false)
  const [editingActual, setEditingActual] = useState(false)
  const [targetInput, setTargetInput] = useState(course.targetGrade || 'B+')
  const [actualInput, setActualInput] = useState(course.actualGrade || '')
  const targetRef = useRef(null)
  const actualRef = useRef(null)

  useEffect(() => { if (editingTarget && targetRef.current) targetRef.current.focus() }, [editingTarget])
  useEffect(() => { if (editingActual && actualRef.current) actualRef.current.focus() }, [editingActual])

  const projected = getProjectedGrade(course)
  const effectiveGrade = course.actualGrade
    ? (GRADE_SCALE.find(g => g.label === course.actualGrade)?.min ?? projected)
    : projected
  const gradePoints = percentToGPA(effectiveGrade) * course.credits

  // "What do I need on the final?" calculation
  const computeNeeded = () => {
    const targetLetterEntry = GRADE_SCALE.find(g => g.label === (course.targetGrade || 'B+'))
    const neededPct = targetLetterEntry ? targetLetterEntry.min : 83
    const preWeight = 1 - (course.finalWeight / 100)
    const needed = (neededPct - course.currentGrade * preWeight) / (course.finalWeight / 100)
    if (needed <= 0) return { score: 0, impossible: false }
    if (needed > 100) return { score: null, impossible: true }
    return { score: Math.ceil(needed), impossible: false }
  }
  const needed = computeNeeded()

  const commitTarget = (val) => {
    const clean = val.toUpperCase().trim()
    const valid = GRADE_SCALE.find(g => g.label === clean)
    if (valid) onUpdate(index, 'targetGrade', clean)
    setEditingTarget(false)
  }
  const commitActual = (val) => {
    const clean = val.toUpperCase().trim()
    if (!clean) { onUpdate(index, 'actualGrade', null); setEditingActual(false); return }
    const valid = GRADE_SCALE.find(g => g.label === clean)
    if (valid) onUpdate(index, 'actualGrade', clean)
    setEditingActual(false)
  }

  const actualGPAVal = course.actualGrade ? letterToGPA(course.actualGrade) : null
  const hasActual = course.actualGrade !== null && course.actualGrade !== undefined

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{ ...S.card, position: 'relative' }}>
      {/* Course color bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, #3b82f6, #06b6d4)`,
        opacity: 0.6,
      }} />

      <div style={{ padding: '18px 18px 14px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              type="text"
              value={course.name}
              onChange={e => onUpdate(index, 'name', e.target.value)}
              style={{
                background: 'transparent', border: 'none', borderBottom: '1px solid transparent',
                color: '#f1f5f9', fontSize: 15, fontWeight: 900, outline: 'none',
                width: '100%', padding: '2px 0',
                transition: 'border-color 0.2s',
              }}
              placeholder="Course name"
              onFocus={e => e.target.style.borderBottomColor = '#3b82f6'}
              onBlur={e => e.target.style.borderBottomColor = 'transparent'}
            />
            <input
              type="text"
              value={course.code || ''}
              onChange={e => onUpdate(index, 'code', e.target.value)}
              style={{
                background: 'transparent', border: 'none',
                color: '#475569', fontSize: 11, fontWeight: 700, outline: 'none',
                width: '100%', padding: '2px 0', marginTop: 2,
              }}
              placeholder="Course code (e.g. MATH 101)"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{
              background: '#131922', border: '1px solid #1e2530', borderRadius: 8,
              padding: '4px 10px', fontSize: 11, fontWeight: 900, color: '#64748b',
            }}>
              {course.credits} cr
            </div>
            {allCourses.length > 1 && (
              <button onClick={() => onRemove(index)} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                color: '#ef4444', borderRadius: 8, display: 'flex', alignItems: 'center',
                opacity: 0.6, transition: 'opacity 0.15s',
              }} onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0.6}>
                <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Sliders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <SliderRow label="Credits" value={course.credits} min={0.5} max={6} step={0.5}
            onChange={v => onUpdate(index, 'credits', parseFloat(v))}
            display={`${course.credits}`} />
          <SliderRow label="Current grade (before final)" value={course.currentGrade} min={0} max={100} step={1}
            onChange={v => onUpdate(index, 'currentGrade', parseInt(v))}
            display={`${course.currentGrade}% (${percentToLetter(course.currentGrade)})`}
            displayColor={gradeColor(course.currentGrade)} />
          <SliderRow label="Final exam weight" value={course.finalWeight} min={5} max={70} step={5}
            onChange={v => onUpdate(index, 'finalWeight', parseInt(v))}
            display={`${course.finalWeight}%`} />
          <SliderRow label="What if I score on the final..." value={course.finalScore} min={0} max={100} step={1}
            onChange={v => onUpdate(index, 'finalScore', parseInt(v))}
            display={`${course.finalScore}%`}
            displayColor="#06b6d4" />
        </div>

        {/* Grade cells row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {/* Target grade */}
          <div style={{ background: '#131922', borderRadius: 10, padding: '10px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Target</div>
            {editingTarget ? (
              <input
                ref={targetRef}
                type="text"
                defaultValue={course.targetGrade || 'B+'}
                style={{
                  background: 'transparent', border: 'none', borderBottom: '1px solid #3b82f6',
                  color: '#3b82f6', fontSize: 16, fontWeight: 900, textAlign: 'center',
                  outline: 'none', width: '100%', padding: '2px 0',
                }}
                onBlur={e => commitTarget(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitTarget(e.target.value) }}
              />
            ) : (
              <div
                onClick={() => setEditingTarget(true)}
                style={{ fontSize: 16, fontWeight: 900, color: '#3b82f6', cursor: 'pointer', lineHeight: 1 }}
                title="Click to edit target grade">
                {course.targetGrade || 'B+'}
              </div>
            )}
          </div>

          {/* Actual grade */}
          <div style={{
            background: hasActual ? '#0f1f14' : '#131922',
            border: hasActual ? '1px solid #22c55e30' : '1px solid transparent',
            borderRadius: 10, padding: '10px 10px', textAlign: 'center',
            transition: 'all 0.3s',
          }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              {hasActual ? 'ACTUAL' : 'ACTUAL'}
            </div>
            {editingActual ? (
              <input
                ref={actualRef}
                type="text"
                defaultValue={course.actualGrade || ''}
                style={{
                  background: 'transparent', border: 'none', borderBottom: '1px solid #22c55e',
                  color: '#22c55e', fontSize: 16, fontWeight: 900, textAlign: 'center',
                  outline: 'none', width: '100%', padding: '2px 0',
                }}
                placeholder="A-"
                onBlur={e => commitActual(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitActual(e.target.value) }}
              />
            ) : (
              <div
                onClick={() => setEditingActual(true)}
                style={{
                  fontSize: 16, fontWeight: 900,
                  color: hasActual ? '#22c55e' : '#334155',
                  cursor: 'pointer', lineHeight: 1,
                }}
                title="Click to enter actual grade">
                {course.actualGrade || '--'}
              </div>
            )}
            {hasActual && (
              <div style={{ fontSize: 9, color: '#22c55e', marginTop: 2, fontWeight: 700 }}>confirmed</div>
            )}
          </div>

          {/* Grade points */}
          <div style={{ background: '#131922', borderRadius: 10, padding: '10px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Pts × Cr</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: gpaColor(gradePoints / course.credits), lineHeight: 1 }}>
              {gradePoints.toFixed(1)}
            </div>
            <div style={{ fontSize: 9, color: '#334155', marginTop: 2 }}>{(gradePoints / course.credits).toFixed(1)} GPA</div>
          </div>

          {/* Need on final */}
          <div style={{
            background: needed.impossible ? '#1f0f0f' : '#131922',
            border: needed.impossible ? '1px solid #ef444430' : '1px solid transparent',
            borderRadius: 10, padding: '10px 8px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Need Final
            </div>
            {needed.impossible ? (
              <div style={{ fontSize: 11, fontWeight: 900, color: '#ef4444', lineHeight: 1.2 }}>Not<br />Possible</div>
            ) : (
              <>
                <div style={{ fontSize: 16, fontWeight: 900, color: gradeColor(100 - (needed.score || 0)), lineHeight: 1 }}>
                  {needed.score === 0 ? 'Done!' : `${needed.score}%`}
                </div>
                <div style={{ fontSize: 9, color: '#334155', marginTop: 2 }}>for {course.targetGrade || 'B+'}</div>
              </>
            )}
          </div>
        </div>

        {/* Projected result bar */}
        <div style={{ borderTop: '1px solid #1e2530', paddingTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>
              {hasActual ? 'ACTUAL GRADE' : 'PROJECTED FINAL'}
              {hasActual && <span style={{ marginLeft: 6, color: '#22c55e', fontSize: 9 }}>● live</span>}
            </span>
            <span style={{ fontSize: 13, fontWeight: 900, color: gradeColor(effectiveGrade) }}>
              {effectiveGrade.toFixed(1)}% — {percentToLetter(effectiveGrade)}
            </span>
          </div>
          <div style={{ height: 6, background: '#1e2530', borderRadius: 99, overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${Math.min(effectiveGrade, 100)}%` }}
              initial={{ width: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{
                height: '100%', borderRadius: 99,
                background: `linear-gradient(90deg, ${gradeColor(effectiveGrade)}, ${gradeColor(effectiveGrade)}99)`,
                boxShadow: `0 0 8px ${gradeColor(effectiveGrade)}60`,
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Slider row ──────────────────────────────────────────────────────────────
function SliderRow({ label, value, min, max, step, onChange, display, displayColor }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 900, color: displayColor || '#94a3b8' }}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', accentColor: '#3b82f6' }} />
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function GPASimulator() {
  const { courses, setCourses, cumulativeGPA, setCumulativeGPA, cumulativeCredits, setCumulativeCredits } = useGPA()
  const [targetGPA, setTargetGPA] = useState(3.5)
  const [showPrevious, setShowPrevious] = useState(false)
  const [gpaHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('clutch-gpa-history')) || [] } catch { return [] }
  })

  const updateCourse = (index, field, value) =>
    setCourses(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c))
  const addCourse = () => setCourses(prev => [...prev, { ...EMPTY_COURSE, name: `Course ${prev.length + 1}` }])
  const removeCourse = (index) => { if (courses.length <= 1) return; setCourses(prev => prev.filter((_, i) => i !== index)) }

  const getProjectedGrade = (course) => {
    if (course.actualGrade) {
      const entry = GRADE_SCALE.find(g => g.label === course.actualGrade)
      return entry ? entry.min : 0
    }
    const preWeight = 1 - (course.finalWeight / 100)
    return (course.currentGrade * preWeight) + (course.finalScore * (course.finalWeight / 100))
  }

  const calcSemesterGPA = (overrideFinalScore) => {
    let totalPoints = 0, totalCredits = 0
    courses.forEach(c => {
      const grade = overrideFinalScore !== undefined
        ? (c.currentGrade * (1 - c.finalWeight / 100)) + (overrideFinalScore * (c.finalWeight / 100))
        : getProjectedGrade(c)
      totalPoints += percentToGPA(grade) * c.credits
      totalCredits += c.credits
    })
    return totalCredits > 0 ? totalPoints / totalCredits : 0
  }

  const semesterGPA = calcSemesterGPA()
  const worstGPA = calcSemesterGPA(50)
  const bestGPA = calcSemesterGPA(100)

  const projectedCumulativeGPA = (() => {
    const semCredits = courses.reduce((sum, c) => sum + c.credits, 0)
    const totalCredits = cumulativeCredits + semCredits
    if (totalCredits === 0) return semesterGPA
    return ((cumulativeGPA * cumulativeCredits) + (semesterGPA * semCredits)) / totalCredits
  })()

  const worstCumulative = (() => {
    const semCredits = courses.reduce((sum, c) => sum + c.credits, 0)
    const totalCredits = cumulativeCredits + semCredits
    if (totalCredits === 0) return worstGPA
    return ((cumulativeGPA * cumulativeCredits) + (worstGPA * semCredits)) / totalCredits
  })()

  const bestCumulative = (() => {
    const semCredits = courses.reduce((sum, c) => sum + c.credits, 0)
    const totalCredits = cumulativeCredits + semCredits
    if (totalCredits === 0) return bestGPA
    return ((cumulativeGPA * cumulativeCredits) + (bestGPA * semCredits)) / totalCredits
  })()

  const historyWithCurrent = [...gpaHistory, semesterGPA]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={S.page}>

      {/* ── SCENE HEADER ── */}
      <div style={{ padding: '8px 20px 0' }}>
        <div style={S.sceneLabel}>SCENE 00 — GPA SIMULATOR</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <h1 style={S.heading}>GPA Simulator</h1>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', paddingBottom: 4 }}>{SEMESTER_LABEL}</div>
        </div>
        <p style={S.subheading}>Project finals. Enter actuals. Know exactly where you stand.</p>
      </div>

      <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── BIG GPA GAUGE ── */}
        <div style={{ ...S.card, padding: '28px 20px 20px', textAlign: 'center' }}>
          <div style={S.sceneLabel}>CURRENT SEMESTER GPA</div>
          <GPAGauge gpa={semesterGPA} />
          {historyWithCurrent.length > 1 && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#334155' }}>TREND</div>
              <Sparkline data={historyWithCurrent} width={120} height={28} />
            </div>
          )}
          {cumulativeCredits > 0 && (
            <div style={{ marginTop: 12, fontSize: 12, color: '#475569', fontWeight: 600 }}>
              Cumulative (projected):{' '}
              <span style={{ color: gpaColor(projectedCumulativeGPA), fontWeight: 900 }}>
                {projectedCumulativeGPA.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* ── SCENARIO BAR ── */}
        <div>
          <div style={S.sectionLabel}>SCENARIO ANALYSIS</div>
          <ScenarioBar worst={worstCumulative} current={projectedCumulativeGPA} best={bestCumulative} />
        </div>

        {/* ── TARGET GPA ── */}
        <div style={{ ...S.card, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#f1f5f9' }}>Target Cumulative GPA</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 2, fontWeight: 600 }}>Drag to set your goal</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#3b82f6', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {targetGPA.toFixed(1)}
              </div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 2, fontWeight: 700 }}>{gpaToLetter(targetGPA)}</div>
            </div>
          </div>
          <input type="range" min="0" max="4" step="0.1" value={targetGPA}
            onChange={e => setTargetGPA(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#3b82f6' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            {['0.0', '1.0', '2.0', '3.0', '4.0'].map(v => (
              <span key={v} style={{ fontSize: 9, fontWeight: 700, color: '#334155' }}>{v}</span>
            ))}
          </div>
        </div>

        {/* ── PREVIOUS SEMESTERS ── */}
        <div style={S.card}>
          <button
            onClick={() => setShowPrevious(v => !v)}
            style={{
              width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', background: 'none', border: 'none',
              cursor: 'pointer', textAlign: 'left',
            }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#f1f5f9' }}>Previous Semesters</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 2, fontWeight: 600 }}>
                {cumulativeCredits > 0
                  ? `${cumulativeCredits} credits · ${cumulativeGPA.toFixed(2)} GPA`
                  : 'Optional — for cumulative GPA calculation'}
              </div>
            </div>
            <motion.div animate={{ rotate: showPrevious ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="#475569" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </button>
          <AnimatePresence>
            {showPrevious && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{ overflow: 'hidden' }}>
                <div style={{ borderTop: '1px solid #1e2530', padding: '14px 18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#475569', marginBottom: 6 }}>
                        Cumulative GPA
                      </label>
                      <input type="number" min="0" max="4" step="0.01" value={cumulativeGPA || ''}
                        onChange={e => setCumulativeGPA(parseFloat(e.target.value) || 0)}
                        style={S.input} placeholder="0.00" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#475569', marginBottom: 6 }}>
                        Total Credits
                      </label>
                      <input type="number" min="0" step="1" value={cumulativeCredits || ''}
                        onChange={e => setCumulativeCredits(parseInt(e.target.value) || 0)}
                        style={S.input} placeholder="0" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── FINALS ALERT BANNER ── */}
        {(() => {
          const alerts = courses
            .filter(c => !c.actualGrade)
            .map(c => {
              const targetEntry = GRADE_SCALE.find(g => g.label === (c.targetGrade || 'B+'))
              const neededPct = targetEntry ? targetEntry.min : 83
              const preWeight = 1 - (c.finalWeight / 100)
              const raw = (neededPct - c.currentGrade * preWeight) / (c.finalWeight / 100)
              if (raw <= 0) return { name: c.name || 'Course', score: 0, done: true, target: c.targetGrade || 'B+', weight: c.finalWeight }
              if (raw > 100) return { name: c.name || 'Course', impossible: true, target: c.targetGrade || 'B+', weight: c.finalWeight }
              return { name: c.name || 'Course', score: Math.ceil(raw), target: c.targetGrade || 'B+', weight: c.finalWeight }
            })
          const danger = alerts.filter(a => a.impossible || (a.score && a.score >= 80))
          const ok = alerts.filter(a => !a.impossible && (a.done || (a.score && a.score < 80)))
          if (alerts.length === 0) return null
          return (
            <div style={{ ...S.card, padding: '20px 18px', background: danger.length > 0 ? '#120d0d' : '#0d1810' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{
                  fontSize: 9, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: danger.length > 0 ? '#ef4444' : '#22c55e',
                  border: `1px solid ${danger.length > 0 ? '#ef444430' : '#22c55e30'}`,
                  padding: '3px 8px', borderRadius: 4,
                }}>
                  {danger.length > 0 ? '⚠ FINALS ALERT' : '✓ FINALS STATUS'}
                </div>
                <div style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                  What you need on each final
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {alerts.map((a, i) => {
                  const isHigh = !a.done && !a.impossible && a.score >= 90
                  const isMed  = !a.done && !a.impossible && a.score >= 70 && a.score < 90
                  const color  = a.impossible ? '#ef4444' : a.done ? '#22c55e' : isHigh ? '#f97316' : isMed ? '#f59e0b' : '#22c55e'
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>{a.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', flexShrink: 0 }}>
                            for {a.target} · {a.weight}% of grade
                          </span>
                        </div>
                        <div style={{ height: 5, background: '#1e2530', borderRadius: 99, overflow: 'hidden' }}>
                          <motion.div
                            animate={{ width: a.impossible ? '100%' : a.done ? '100%' : `${a.score}%` }}
                            initial={{ width: 0 }}
                            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 }}
                            style={{ height: '100%', borderRadius: 99, background: color, boxShadow: `0 0 6px ${color}70` }}
                          />
                        </div>
                      </div>
                      <div style={{
                        flexShrink: 0, minWidth: 64, textAlign: 'right',
                        fontSize: a.impossible ? 12 : 22,
                        fontWeight: 900, color, letterSpacing: '-0.03em', lineHeight: 1,
                      }}>
                        {a.impossible ? 'NOT POSSIBLE' : a.done ? 'DONE ✓' : `${a.score}%`}
                      </div>
                    </div>
                  )
                })}
              </div>
              {ok.length === alerts.length && (
                <div style={{ marginTop: 12, fontSize: 11, color: '#22c55e', fontWeight: 700 }}>
                  You're on track for all your target grades. Keep it up!
                </div>
              )}
            </div>
          )
        })()}

        {/* ── COURSES TABLE ── */}
        <div>
          <div style={S.sectionLabel}>COURSES THIS SEMESTER</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {courses.map((course, i) => (
              <CourseRow
                key={i}
                course={course}
                index={i}
                onUpdate={updateCourse}
                onRemove={removeCourse}
                targetGPA={targetGPA}
                cumulativeGPA={cumulativeGPA}
                cumulativeCredits={cumulativeCredits}
                allCourses={courses}
                getProjectedGrade={getProjectedGrade}
              />
            ))}
          </div>
        </div>

        {/* ── ADD COURSE ── */}
        <motion.button
          whileHover={{ borderColor: '#3b82f6', scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={addCourse}
          style={{
            width: '100%', padding: '14px', borderRadius: 14,
            border: '2px dashed #1e2530', background: 'none',
            color: '#475569', fontSize: 13, fontWeight: 900,
            cursor: 'pointer', transition: 'all 0.2s',
          }}>
          + Add Course
        </motion.button>

        {/* ── GRADE SCALE REFERENCE ── */}
        <GradeScaleRef />

        {/* ── SUMMARY FOOTER ── */}
        <div style={{ ...S.card, padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
          {[
            { label: 'Semester GPA', value: semesterGPA.toFixed(2), color: gpaColor(semesterGPA) },
            { label: 'Total Credits', value: courses.reduce((s, c) => s + c.credits, 0).toString(), color: '#3b82f6' },
            { label: 'Cumulative', value: projectedCumulativeGPA.toFixed(2), color: gpaColor(projectedCumulativeGPA) },
          ].map((item, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: '0 8px',
              borderRight: i < 2 ? '1px solid #1e2530' : 'none',
            }}>
              <div style={{ fontSize: 9, fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: item.color, letterSpacing: '-0.03em' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

      </div>
    </motion.div>
  )
}
