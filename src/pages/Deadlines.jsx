import { useState, useEffect, useMemo } from 'react'

const EMPTY_DEADLINE = { title: '', course: '', date: '', weight: 5, difficulty: 5, type: 'assignment', completed: false }

const TYPE_CONFIG = {
  assignment: { label: 'Assignment', color: '#7c3aed' },
  exam: { label: 'Exam', color: '#ef4444' },
  quiz: { label: 'Quiz', color: '#f59e0b' },
  project: { label: 'Project', color: '#06b6d4' },
  essay: { label: 'Essay', color: '#22c55e' },
  other: { label: 'Other', color: '#8b5cf6' },
}

export default function Deadlines() {
  const [deadlines, setDeadlines] = useState(() => {
    try { return JSON.parse(localStorage.getItem('clutch-deadlines')) || [] } catch { return [] }
  })
  const [showForm, setShowForm] = useState(false)
  const [editIndex, setEditIndex] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_DEADLINE })
  const [filter, setFilter] = useState('active')
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

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
    let filtered = [...deadlines]
    if (filter === 'active') filtered = filtered.filter(d => !d.completed)
    else if (filter === 'completed') filtered = filtered.filter(d => d.completed)
    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(d => d.title.toLowerCase().includes(q) || d.course.toLowerCase().includes(q))
    }
    return filtered.map((d, i) => ({ ...d, originalIndex: i, dangerScore: getDangerScore(d) }))
      .sort((a, b) => b.dangerScore - a.dangerScore)
  }, [deadlines, filter, search])

  const topPriority = sortedDeadlines.find(d => !d.completed)
  const activeCount = deadlines.filter(d => !d.completed).length

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

  return (
    <div className="space-y-5 pb-24 sm:pb-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>Deadlines</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Ranked by danger level. Do what's on top first.</p>
        </div>
        <button onClick={openAdd} className="btn-glow px-4 py-2.5 text-sm shrink-0">+ Add</button>
      </div>

      {/* Top priority banner */}
      {topPriority && (
        <div className="rounded-2xl p-4" style={{
          background: `linear-gradient(135deg, ${getDangerColor(topPriority.dangerScore)}18, transparent)`,
          border: `1px solid ${getDangerColor(topPriority.dangerScore)}44`
        }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${getDangerColor(topPriority.dangerScore)}20` }}>
              <svg className="w-5 h-5" style={{ color: getDangerColor(topPriority.dangerScore) }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: getDangerColor(topPriority.dangerScore) }}>Do This Right Now</p>
              <p className="font-bold text-base mt-0.5 truncate" style={{ color: 'var(--text-primary)' }}>{topPriority.title}</p>
              <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {topPriority.course && <span>{topPriority.course}</span>}
                <span style={{ color: getTimeLeft(topPriority.date).color }}>{getTimeLeft(topPriority.date).text}</span>
                <span>Danger <strong style={{ color: getDangerColor(topPriority.dangerScore) }}>{topPriority.dangerScore.toFixed(1)}/10</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="space-y-2">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="input w-full pl-9 pr-4 py-2.5 text-sm" placeholder="Search deadlines..." />
        </div>
        <div className="flex gap-2">
          {[['active', `Active (${activeCount})`], ['completed', 'Completed'], ['all', 'All']].map(([f, label]) => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200"
              style={{
                background: filter === f ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'var(--bg-input)',
                color: filter === f ? 'white' : 'var(--text-muted)'
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {sortedDeadlines.length === 0 ? (
        <div className="card py-16 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-input)' }}>
            <svg className="w-7 h-7" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {search ? 'No results found' : filter === 'completed' ? 'Nothing completed yet' : 'No deadlines yet'}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {search ? `Try a different search term` : 'Add your first deadline to get started'}
          </p>
          {!search && filter === 'active' && (
            <button onClick={openAdd} className="btn-glow px-5 py-2.5 text-sm mt-4 mx-auto inline-block">+ Add deadline</button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {sortedDeadlines.map((d) => {
            const timeLeft = getTimeLeft(d.date)
            const dangerColor = getDangerColor(d.dangerScore)
            const type = TYPE_CONFIG[d.type] || TYPE_CONFIG.other
            return (
              <div key={d.originalIndex}
                className={`card p-4 transition-all duration-300 ${d.completed ? 'opacity-50' : ''} ${timeLeft.urgent && !d.completed ? 'animate-pulse-glow' : ''}`}
                style={{ borderLeft: `3px solid ${d.completed ? 'var(--border-color)' : dangerColor}` }}>
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button onClick={() => toggleComplete(d.originalIndex)}
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200"
                    style={{
                      borderColor: d.completed ? 'var(--color-success-500)' : dangerColor,
                      backgroundColor: d.completed ? 'var(--color-success-500)' : 'transparent',
                    }}>
                    {d.completed && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold text-sm ${d.completed ? 'line-through' : ''}`} style={{ color: 'var(--text-primary)' }}>
                        {d.title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold" style={{ backgroundColor: `${type.color}20`, color: type.color }}>
                        {type.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs flex-wrap" style={{ color: 'var(--text-muted)' }}>
                      {d.course && <span className="font-medium">{d.course}</span>}
                      <span className="font-semibold" style={{ color: timeLeft.color }}>{timeLeft.text}</span>
                      <span>W: {d.weight}/10</span>
                      <span>D: {d.difficulty}/10</span>
                    </div>

                    {/* Danger bar */}
                    {!d.completed && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-input)' }}>
                          <div className="h-full rounded-full transition-all duration-700 progress-glow"
                            style={{ width: `${(d.dangerScore / 10) * 100}%`, background: `linear-gradient(90deg, ${dangerColor}, ${dangerColor}aa)` }} />
                        </div>
                        <span className="text-[10px] font-bold shrink-0" style={{ color: dangerColor }}>{d.dangerScore.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(d.originalIndex)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:bg-[var(--bg-input)]"
                      style={{ color: 'var(--text-muted)' }}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button onClick={() => setDeleteConfirm(d.originalIndex)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:bg-danger-500/10"
                      style={{ color: 'var(--text-muted)' }}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 overlay-blur animate-fade-in">
          <div className="card w-full max-w-md animate-slide-up sm:animate-scale-in">
            <div className="p-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  {editIndex !== null ? 'Edit Deadline' : 'New Deadline'}
                </h2>
                <button onClick={() => { setShowForm(false); setEditIndex(null) }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition hover:bg-[var(--bg-input)]"
                  style={{ color: 'var(--text-muted)' }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>What's due? *</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="input w-full px-4 py-3 text-sm" placeholder="e.g., ECON 101 Midterm" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Course (optional)</label>
                <input type="text" value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))}
                  className="input w-full px-4 py-3 text-sm" placeholder="e.g., ECON 101" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Due date *</label>
                <input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="input w-full px-4 py-3 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Type</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(TYPE_CONFIG).map(([key, { label, color }]) => (
                    <button key={key} onClick={() => setForm(f => ({ ...f, type: key }))}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200"
                      style={{
                        backgroundColor: form.type === key ? `${color}25` : 'var(--bg-input)',
                        color: form.type === key ? color : 'var(--text-muted)',
                        border: `1px solid ${form.type === key ? color + '44' : 'transparent'}`
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Grade weight</label>
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{form.weight}/10</span>
                </div>
                <input type="range" min="1" max="10" step="1" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: parseInt(e.target.value) }))} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Difficulty</label>
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{form.difficulty}/10</span>
                </div>
                <input type="range" min="1" max="10" step="1" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: parseInt(e.target.value) }))} />
              </div>
            </div>

            <div className="p-5 border-t flex gap-3" style={{ borderColor: 'var(--border-color)' }}>
              <button onClick={() => { setShowForm(false); setEditIndex(null) }}
                className="btn-ghost flex-1 py-3 text-sm">
                Cancel
              </button>
              <button onClick={handleSave} disabled={!form.title || !form.date}
                className="btn-glow flex-1 py-3 text-sm">
                {editIndex !== null ? 'Save Changes' : 'Add Deadline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overlay-blur animate-fade-in">
          <div className="card w-full max-w-xs p-6 text-center animate-scale-in">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.12)' }}>
              <svg className="w-6 h-6" style={{ color: 'var(--color-danger-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="font-extrabold text-base mb-1" style={{ color: 'var(--text-primary)' }}>Delete deadline?</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
              "{deadlines[deleteConfirm]?.title}" will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition"
                style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: 'var(--color-danger-400)' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
