import { useState, useEffect, useMemo } from 'react'

const EMPTY_DEADLINE = { title: '', course: '', date: '', weight: 5, difficulty: 5, type: 'assignment', completed: false }

export default function Deadlines() {
  const [deadlines, setDeadlines] = useState(() => { try { return JSON.parse(localStorage.getItem('clutch-deadlines')) || [] } catch { return [] } })
  const [showForm, setShowForm] = useState(false)
  const [editIndex, setEditIndex] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_DEADLINE })
  const [filter, setFilter] = useState('active')

  useEffect(() => { localStorage.setItem('clutch-deadlines', JSON.stringify(deadlines)) }, [deadlines])

  const getDangerScore = (d) => {
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

  const getTimeLeft = (dateStr) => {
    const now = new Date(), due = new Date(dateStr), diff = due - now
    if (diff < 0) return { text: 'OVERDUE', color: 'var(--color-danger-400)', urgent: true }
    const hours = Math.floor(diff / (1000 * 60 * 60)), days = Math.floor(hours / 24)
    if (hours < 24) return { text: `${hours}h left`, color: 'var(--color-danger-400)', urgent: true }
    if (days <= 2) return { text: `${days}d ${hours % 24}h`, color: 'var(--color-danger-400)', urgent: true }
    if (days <= 5) return { text: `${days} days`, color: 'var(--color-warning-400)', urgent: false }
    if (days <= 14) return { text: `${days} days`, color: 'var(--color-success-400)', urgent: false }
    return { text: `${days} days`, color: 'var(--text-muted)', urgent: false }
  }

  const getDangerColor = (score) => {
    if (score >= 8) return 'var(--color-danger-400)'
    if (score >= 5) return 'var(--color-warning-400)'
    if (score >= 3) return 'var(--color-accent-400)'
    return 'var(--color-success-400)'
  }

  const sortedDeadlines = useMemo(() => {
    let filtered = deadlines
    if (filter === 'active') filtered = deadlines.filter(d => !d.completed)
    else if (filter === 'completed') filtered = deadlines.filter(d => d.completed)
    return filtered.map((d, i) => ({ ...d, originalIndex: i, dangerScore: getDangerScore(d) })).sort((a, b) => b.dangerScore - a.dangerScore)
  }, [deadlines, filter])

  const topPriority = sortedDeadlines.find(d => !d.completed)
  const handleSave = () => { if (!form.title || !form.date) return; if (editIndex !== null) { setDeadlines(prev => prev.map((d, i) => i === editIndex ? { ...form } : d)) } else { setDeadlines(prev => [...prev, { ...form }]) }; setForm({ ...EMPTY_DEADLINE }); setShowForm(false); setEditIndex(null) }
  const handleEdit = (i) => { setForm({ ...deadlines[i] }); setEditIndex(i); setShowForm(true) }
  const handleDelete = (i) => setDeadlines(prev => prev.filter((_, idx) => idx !== i))
  const toggleComplete = (i) => setDeadlines(prev => prev.map((d, idx) => idx === i ? { ...d, completed: !d.completed } : d))

  const typeIcons = { assignment: { label: 'Assignment' }, exam: { label: 'Exam' }, quiz: { label: 'Quiz' }, project: { label: 'Project' }, essay: { label: 'Essay' }, other: { label: 'Other' } }

  return (
    <div className="space-y-6 pb-20 sm:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Deadlines</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Ranked by danger level. Do what's on top first.</p>
        </div>
        <button onClick={() => { setForm({ ...EMPTY_DEADLINE }); setEditIndex(null); setShowForm(true) }} className="px-4 py-2 bg-accent-500 text-white text-sm font-semibold rounded-lg hover:bg-accent-600 transition">+ Add</button>
      </div>

      {topPriority && (
        <div className="rounded-xl p-4 border-2" style={{ borderColor: getDangerColor(topPriority.dangerScore), backgroundColor: 'var(--bg-card)' }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: getDangerColor(topPriority.dangerScore) }}>Do this right now</div>
          <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{topPriority.title}</div>
          <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {topPriority.course && <span>{topPriority.course}</span>}
            <span style={{ color: getTimeLeft(topPriority.date).color }}>{getTimeLeft(topPriority.date).text}</span>
            <span>Danger: <strong style={{ color: getDangerColor(topPriority.dangerScore) }}>{topPriority.dangerScore.toFixed(1)}</strong>/10</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {['active', 'completed', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition" style={{ backgroundColor: filter === f ? 'var(--color-accent-500)' : 'var(--bg-input)', color: filter === f ? 'white' : 'var(--text-muted)' }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}{f === 'active' && ` (${deadlines.filter(d => !d.completed).length})`}
          </button>
        ))}
      </div>

      {sortedDeadlines.length === 0 ? (
        <div className="text-center py-12 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <svg className="w-10 h-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No deadlines yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Add your first deadline to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDeadlines.map((d) => {
            const timeLeft = getTimeLeft(d.date)
            return (
              <div key={d.originalIndex} className="rounded-xl p-4 border flex items-start gap-3 transition" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', opacity: d.completed ? 0.5 : 1 }}>
                <button onClick={() => toggleComplete(d.originalIndex)} className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition" style={{ borderColor: d.completed ? 'var(--color-success-500)' : 'var(--border-color)', backgroundColor: d.completed ? 'var(--color-success-500)' : 'transparent' }}>
                  {d.completed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`font-semibold text-sm ${d.completed ? 'line-through' : ''}`} style={{ color: 'var(--text-primary)' }}>{d.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>{typeIcons[d.type]?.label || d.type}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {d.course && <span>{d.course}</span>}
                    <span style={{ color: timeLeft.color }}>{timeLeft.text}</span>
                    <span>W:{d.weight}</span><span>D:{d.difficulty}</span>
                  </div>
                </div>
                {!d.completed && <div className="text-right shrink-0"><div className="text-lg font-bold" style={{ color: getDangerColor(d.dangerScore) }}>{d.dangerScore.toFixed(1)}</div><div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Danger</div></div>}
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => handleEdit(d.originalIndex)} className="p-1 rounded" style={{ color: 'var(--text-muted)' }}><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                  <button onClick={() => handleDelete(d.originalIndex)} className="p-1 rounded" style={{ color: 'var(--color-danger-400)' }}><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{editIndex !== null ? 'Edit Deadline' : 'Add Deadline'}</h2>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>What's due?</label><input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none focus:border-accent-500" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} placeholder="e.g., ECON 101 Midterm" /></div>
              <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Course (optional)</label><input type="text" value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none focus:border-accent-500" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} placeholder="e.g., ECON 101" /></div>
              <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Due date</label><input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none focus:border-accent-500" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} /></div>
              <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Type</label><div className="flex flex-wrap gap-2">{Object.entries(typeIcons).map(([key, { label }]) => (<button key={key} onClick={() => setForm(f => ({ ...f, type: key }))} className="px-3 py-1.5 rounded-lg text-xs font-medium transition" style={{ backgroundColor: form.type === key ? 'var(--color-accent-500)' : 'var(--bg-input)', color: form.type === key ? 'white' : 'var(--text-muted)' }}>{label}</button>))}</div></div>
              <div><div className="flex items-center justify-between text-xs mb-1"><span style={{ color: 'var(--text-muted)' }}>Grade weight (how much is it worth?)</span><span style={{ color: 'var(--text-primary)' }}>{form.weight}/10</span></div><input type="range" min="1" max="10" step="1" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: parseInt(e.target.value) }))} className="w-full accent-accent-500" /></div>
              <div><div className="flex items-center justify-between text-xs mb-1"><span style={{ color: 'var(--text-muted)' }}>Difficulty (how hard is it?)</span><span style={{ color: 'var(--text-primary)' }}>{form.difficulty}/10</span></div><input type="range" min="1" max="10" step="1" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: parseInt(e.target.value) }))} className="w-full accent-accent-500" /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowForm(false); setEditIndex(null) }} className="flex-1 py-2.5 rounded-lg text-sm font-medium border" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={handleSave} className="flex-1 py-2.5 bg-accent-500 text-white rounded-lg text-sm font-semibold hover:bg-accent-600 transition">{editIndex !== null ? 'Save changes' : 'Add deadline'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
