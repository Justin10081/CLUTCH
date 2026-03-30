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

const EMPTY_COURSE = { name: '', currentGrade: 75, finalWeight: 30, finalScore: 70, credits: 3 }

export default function GPASimulator() {
  const [courses, setCourses] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem('clutch-gpa-courses')); return saved?.length ? saved : [{ ...EMPTY_COURSE, name: 'Course 1' }] } catch { return [{ ...EMPTY_COURSE, name: 'Course 1' }] }
  })
  const [cumulativeGPA, setCumulativeGPA] = useState(() => parseFloat(localStorage.getItem('clutch-cumulative-gpa') || '0'))
  const [cumulativeCredits, setCumulativeCredits] = useState(() => parseInt(localStorage.getItem('clutch-cumulative-credits') || '0'))
  const [targetGPA, setTargetGPA] = useState(3.5)

  useEffect(() => { localStorage.setItem('clutch-gpa-courses', JSON.stringify(courses)) }, [courses])
  useEffect(() => { localStorage.setItem('clutch-cumulative-gpa', cumulativeGPA.toString()); localStorage.setItem('clutch-cumulative-credits', cumulativeCredits.toString()) }, [cumulativeGPA, cumulativeCredits])

  const updateCourse = (index, field, value) => setCourses(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c))
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
    <div className="space-y-6 pb-20 sm:pb-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>GPA Simulator</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Drag the sliders to see what you need on your finals</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Semester GPA</div>
          <div className="text-3xl font-bold" style={{ color: semesterGPA >= 3.5 ? 'var(--color-success-400)' : semesterGPA >= 2.5 ? 'var(--color-warning-400)' : 'var(--color-danger-400)' }}>{semesterGPA.toFixed(2)}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{gpaToLetter(semesterGPA)}</div>
        </div>
        <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Projected Cumulative</div>
          <div className="text-3xl font-bold" style={{ color: projectedCumulativeGPA >= 3.5 ? 'var(--color-success-400)' : projectedCumulativeGPA >= 2.5 ? 'var(--color-warning-400)' : 'var(--color-danger-400)' }}>{projectedCumulativeGPA.toFixed(2)}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{gpaToLetter(projectedCumulativeGPA)}</div>
        </div>
      </div>
      <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Previous Semesters (optional)</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Cumulative GPA</label>
            <input type="number" min="0" max="4" step="0.01" value={cumulativeGPA || ''} onChange={e => setCumulativeGPA(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:border-accent-500" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} placeholder="0.00" />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Total Credits</label>
            <input type="number" min="0" step="1" value={cumulativeCredits || ''} onChange={e => setCumulativeCredits(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:border-accent-500" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} placeholder="0" />
          </div>
        </div>
      </div>
      <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Target GPA</h3>
          <span className="text-sm font-bold text-accent-500">{targetGPA.toFixed(1)}</span>
        </div>
        <input type="range" min="0" max="4" step="0.1" value={targetGPA} onChange={e => setTargetGPA(parseFloat(e.target.value))} className="w-full accent-accent-500" />
        <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}><span>0.0</span><span>2.0</span><span>4.0</span></div>
      </div>
      <div className="space-y-4">
        {courses.map((course, i) => {
          const projected = getProjectedGrade(course)
          const minNeeded = getMinFinalScore(i)
          return (
            <div key={i} className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center justify-between mb-3">
                <input type="text" value={course.name} onChange={e => updateCourse(i, 'name', e.target.value)} className="font-semibold text-sm bg-transparent outline-none border-b border-transparent focus:border-accent-500 transition" style={{ color: 'var(--text-primary)' }} placeholder="Course name" />
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>{course.credits} cr</span>
                  {courses.length > 1 && <button onClick={() => removeCourse(i)} className="text-danger-400 hover:text-danger-500 transition"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>}
                </div>
              </div>
              <div className="mb-3"><div className="flex items-center justify-between text-xs mb-1"><span style={{ color: 'var(--text-muted)' }}>Credits</span><span style={{ color: 'var(--text-secondary)' }}>{course.credits}</span></div><input type="range" min="1" max="6" step="0.5" value={course.credits} onChange={e => updateCourse(i, 'credits', parseFloat(e.target.value))} className="w-full accent-accent-500" /></div>
              <div className="mb-3"><div className="flex items-center justify-between text-xs mb-1"><span style={{ color: 'var(--text-muted)' }}>Current grade (before final)</span><span className="font-medium" style={{ color: 'var(--text-primary)' }}>{course.currentGrade}% ({percentToLetter(course.currentGrade)})</span></div><input type="range" min="0" max="100" step="1" value={course.currentGrade} onChange={e => updateCourse(i, 'currentGrade', parseInt(e.target.value))} className="w-full accent-accent-500" /></div>
              <div className="mb-3"><div className="flex items-center justify-between text-xs mb-1"><span style={{ color: 'var(--text-muted)' }}>Final exam weight</span><span style={{ color: 'var(--text-secondary)' }}>{course.finalWeight}%</span></div><input type="range" min="5" max="70" step="5" value={course.finalWeight} onChange={e => updateCourse(i, 'finalWeight', parseInt(e.target.value))} className="w-full accent-accent-500" /></div>
              <div className="mb-3"><div className="flex items-center justify-between text-xs mb-1"><span style={{ color: 'var(--text-muted)' }}>What if I get on the final...</span><span className="font-medium" style={{ color: 'var(--color-accent-400)' }}>{course.finalScore}%</span></div><input type="range" min="0" max="100" step="1" value={course.finalScore} onChange={e => updateCourse(i, 'finalScore', parseInt(e.target.value))} className="w-full accent-accent-500" /></div>
              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <div><div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Projected final grade</div><div className="font-bold text-lg" style={{ color: projected >= 80 ? 'var(--color-success-400)' : projected >= 60 ? 'var(--color-warning-400)' : 'var(--color-danger-400)' }}>{projected.toFixed(1)}% ({percentToLetter(projected)})</div></div>
                <div className="text-right"><div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Need on final for {targetGPA.toFixed(1)}</div>{minNeeded !== null ? <div className="font-bold text-lg" style={{ color: minNeeded <= 60 ? 'var(--color-success-400)' : minNeeded <= 80 ? 'var(--color-warning-400)' : 'var(--color-danger-400)' }}>{minNeeded}%</div> : <div className="font-bold text-sm" style={{ color: 'var(--color-danger-400)' }}>Not possible</div>}</div>
              </div>
            </div>
          )
        })}
      </div>
      <button onClick={addCourse} className="w-full py-3 rounded-xl border-2 border-dashed text-sm font-medium transition hover:border-accent-500 hover:text-accent-500" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>+ Add course</button>
    </div>
  )
}
