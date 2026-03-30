import { useState, useEffect } from 'react'

const GRADE_SCALE = [
  { label: 'A+', value: 4.0, min: 90 },
  { label: 'A', value: 4.0, min: 85 },
  { label: 'A-', value: 3.7, min: 80 },
  { label: 'B+', value: 3.3, min: 77 },
  { label: 'B', value: 3.0, min: 73 },
  { label: 'B-', value: 2.7, min: 70 },
  { label: 'C+', value: 2.3, min: 67 },
  { label: 'C', value: 2.0, min: 63 },
  { label: 'C-', value: 1.7, min: 60 },
  { label: 'D+', value: 1.3, min: 57 },
  { label: 'D', value: 1.0, min: 53 },
  { label: 'D-', value: 0.7, min: 50 },
  { label: 'F', value: 0.0, min: 0 },
]

function percentToGPA(pct) {
  for (const g of GRADE_SCALE) { if (pct >= g.min) return g.value }
  return 0
}
function percentToLetter(pct) {
  for (const g of GRADE_SCALE) { if (pct >= g.min) return g.label }
  return 'F'
}
function gpaToLetter(gpa) {
  return GRADE_SCALE.reduce((prev, curr) => Math.abs(curr.value - gpa) < Math.abs(prev.value - gpa) ? curr : prev).label
}

function gpaColor(gpa) {
  if (gpa >= 3.5) return 'var(--color-success-400)'
  if (gpa >= 2.5) return 'var(--color-warning-400)'
  return 'var(--color-danger-400)'
}

function gradeColor(pct) {
  if (pct >= 80) return 'var(--color-success-400)'
  if (pct >= 60) return 'var(--color-warning-400)'
  return 'var(--color-danger-400)'
}

const EMPTY_COURSE = { name: '', currentGrade: 75, finalWeight: 30, finalScore: 70, credits: 3 }

export default function GPASimulator() {
  const [courses, setCourses] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('clutch-gpa-courses'))
      return saved?.length ? saved : [{ ...EMPTY_COURSE, name: 'Course 1' }]
    } catch { return [{ ...EMPTY_COURSE, name: 'Course 1' }] }
  })
  const [cumulativeGPA, setCumulativeGPA] = useState(() => parseFloat(localStorage.getItem('clutch-cumulative-gpa') || '0'))
  const [cumulativeCredits, setCumulativeCredits] = useState(() => parseInt(localStorage.getItem('clutch-cumulative-credits') || '0'))
  const [targetGPA, setTargetGPA] = useState(3.5)
  const [showPrevious, setShowPrevious] = useState(false)

  useEffect(() => { localStorage.setItem('clutch-gpa-courses', JSON.stringify(courses)) }, [courses])
  useEffect(() => {
    localStorage.setItem('clutch-cumulative-gpa', cumulativeGPA.toString())
    localStorage.setItem('clutch-cumulative-credits', cumulativeCredits.toString())
  }, [cumulativeGPA, cumulativeCredits])

  const updateCourse = (index, field, value) =>
    setCourses(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c))
  const addCourse = () => setCourses(prev => [...prev, { ...EMPTY_COURSE, name: `Course ${prev.length + 1}` }])
  const removeCourse = (index) => { if (courses.length <= 1) return; setCourses(prev => prev.filter((_, i) => i !== index)) }

  const getProjectedGrade = (course) => {
    const preWeight = 1 - (course.finalWeight / 100)
    return (course.currentGrade * preWeight) + (course.finalScore * (course.finalWeight / 100))
  }

  const semesterGPA = (() => {
    let totalPoints = 0, totalCredits = 0
    courses.forEach(c => { totalPoints += percentToGPA(getProjectedGrade(c)) * c.credits; totalCredits += c.credits })
    return totalCredits > 0 ? totalPoints / totalCredits : 0
  })()

  const projectedCumulativeGPA = (() => {
    const semCredits = courses.reduce((sum, c) => sum + c.credits, 0)
    const totalCredits = cumulativeCredits + semCredits
    if (totalCredits === 0) return semesterGPA
    return ((cumulativeGPA * cumulativeCredits) + (semesterGPA * semCredits)) / totalCredits
  })()

  const getMinFinalScore = (courseIndex) => {
    const course = courses[courseIndex]
    const preWeight = 1 - (course.finalWeight / 100)
    const otherCourses = courses.filter((_, i) => i !== courseIndex)
    const otherPoints = otherCourses.reduce((sum, c) => sum + percentToGPA(getProjectedGrade(c)) * c.credits, 0)
    const totalCredits = cumulativeCredits + courses.reduce((sum, c) => sum + c.credits, 0)
    const neededTotalPoints = targetGPA * totalCredits
    const neededFromThisCourse = (neededTotalPoints - (cumulativeGPA * cumulativeCredits) - otherPoints) / course.credits
    for (let score = 0; score <= 100; score++) {
      const projected = course.currentGrade * preWeight + score * (course.finalWeight / 100)
      if (percentToGPA(projected) >= neededFromThisCourse) return score
    }
    return null
  }

  return (
    <div className="space-y-5 pb-24 sm:pb-8 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>GPA Simulator</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Drag sliders to see exactly what you need on your finals</p>
      </div>

      {/* GPA Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <GPACard label="Semester GPA" gpa={semesterGPA} />
        <GPACard label="Projected Cumulative" gpa={projectedCumulativeGPA} />
      </div>

      {/* Target GPA */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Target GPA</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>What are you aiming for?</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black" style={{ color: '#7c3aed' }}>{targetGPA.toFixed(1)}</div>
            <div className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>{gpaToLetter(targetGPA)}</div>
          </div>
        </div>
        <input type="range" min="0" max="4" step="0.1" value={targetGPA} onChange={e => setTargetGPA(parseFloat(e.target.value))} />
        <div className="flex justify-between text-[10px] mt-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>
          <span>0.0</span><span>1.0</span><span>2.0</span><span>3.0</span><span>4.0</span>
        </div>
      </div>

      {/* Previous semesters (collapsible) */}
      <div className="card overflow-hidden">
        <button onClick={() => setShowPrevious(v => !v)} className="w-full p-4 flex items-center justify-between text-left">
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Previous Semesters</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {cumulativeCredits > 0 ? `${cumulativeCredits} credits · ${cumulativeGPA.toFixed(2)} GPA` : 'Optional — for cumulative GPA'}
            </p>
          </div>
          <svg className="w-4 h-4 transition-transform duration-200" style={{ color: 'var(--text-muted)', transform: showPrevious ? 'rotate(180deg)' : '' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showPrevious && (
          <div className="px-4 pb-4 pt-0 grid grid-cols-2 gap-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Cumulative GPA</label>
              <input type="number" min="0" max="4" step="0.01" value={cumulativeGPA || ''}
                onChange={e => setCumulativeGPA(parseFloat(e.target.value) || 0)}
                className="input w-full px-3 py-2.5 text-sm" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Total Credits</label>
              <input type="number" min="0" step="1" value={cumulativeCredits || ''}
                onChange={e => setCumulativeCredits(parseInt(e.target.value) || 0)}
                className="input w-full px-3 py-2.5 text-sm" placeholder="0" />
            </div>
          </div>
        )}
      </div>

      {/* Courses */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Courses This Semester</h2>
        <div className="space-y-4">
          {courses.map((course, i) => {
            const projected = getProjectedGrade(course)
            const minNeeded = getMinFinalScore(i)
            return (
              <div key={i} className="card p-4">
                {/* Course name + remove */}
                <div className="flex items-center justify-between mb-4">
                  <input type="text" value={course.name} onChange={e => updateCourse(i, 'name', e.target.value)}
                    className="font-bold text-base bg-transparent outline-none border-b border-transparent focus:border-accent-500 transition w-full mr-2"
                    style={{ color: 'var(--text-primary)' }} placeholder="Course name" />
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                      {course.credits} cr
                    </span>
                    {courses.length > 1 && (
                      <button onClick={() => removeCourse(i)} className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:bg-danger-500/10" style={{ color: 'var(--color-danger-400)' }}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <SliderRow label="Credits" value={course.credits} unit="" min={1} max={6} step={0.5}
                    onChange={v => updateCourse(i, 'credits', parseFloat(v))} display={`${course.credits}`} />
                  <SliderRow label="Current grade (before final)" value={course.currentGrade} unit="%" min={0} max={100} step={1}
                    onChange={v => updateCourse(i, 'currentGrade', parseInt(v))}
                    display={`${course.currentGrade}% (${percentToLetter(course.currentGrade)})`}
                    displayColor={gradeColor(course.currentGrade)} />
                  <SliderRow label="Final exam weight" value={course.finalWeight} unit="%" min={5} max={70} step={5}
                    onChange={v => updateCourse(i, 'finalWeight', parseInt(v))}
                    display={`${course.finalWeight}%`} />
                  <SliderRow label="What if I score on the final..." value={course.finalScore} unit="%" min={0} max={100} step={1}
                    onChange={v => updateCourse(i, 'finalScore', parseInt(v))}
                    display={`${course.finalScore}%`}
                    displayColor="var(--color-accent-400)" />
                </div>

                {/* Result bar */}
                <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4" style={{ borderColor: 'var(--border-color)' }}>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Projected Final</div>
                    <div className="text-2xl font-black" style={{ color: gradeColor(projected) }}>
                      {projected.toFixed(1)}%
                    </div>
                    <div className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>{percentToLetter(projected)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                      Need for {targetGPA.toFixed(1)} GPA
                    </div>
                    {minNeeded !== null ? (
                      <>
                        <div className="text-2xl font-black" style={{ color: gradeColor(100 - minNeeded) }}>
                          {minNeeded}%
                        </div>
                        <div className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>on the final</div>
                      </>
                    ) : (
                      <div className="text-sm font-bold mt-1" style={{ color: 'var(--color-danger-400)' }}>Not possible</div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-input)' }}>
                    <div className="h-full rounded-full transition-all duration-500 progress-glow"
                      style={{ width: `${projected}%`, background: `linear-gradient(90deg, ${gradeColor(projected)}, ${gradeColor(projected)}aa)` }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add course */}
      <button onClick={addCourse}
        className="w-full py-3.5 rounded-2xl border-2 border-dashed text-sm font-semibold transition-all duration-200 hover:border-accent-500 hover:text-accent-400"
        style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
        + Add Course
      </button>
    </div>
  )
}

function GPACard({ label, gpa }) {
  const color = gpaColor(gpa)
  const pct = (gpa / 4) * 100
  const r = 28
  const circ = 2 * Math.PI * r

  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="relative w-16 h-16 shrink-0">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--bg-input)" strokeWidth="5" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ - (pct / 100) * circ}
            style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease', filter: `drop-shadow(0 0 4px ${color})` }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-black" style={{ color }}>{gpa.toFixed(1)}</span>
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</div>
        <div className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>{gpaToLetter(gpa)}</div>
      </div>
    </div>
  )
}

function SliderRow({ label, value, min, max, step, onChange, display, displayColor }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span className="text-xs font-bold" style={{ color: displayColor || 'var(--text-secondary)' }}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}
