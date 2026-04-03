import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { supabase } from '../lib/supabase'

const ease = [0.16, 1, 0.3, 1]

const ROLES = ['user', 'pro', 'admin']
const ROLE_STYLE = {
  user:  { bg: 'rgba(100,116,139,0.15)',  color: '#94a3b8',  border: 'rgba(100,116,139,0.25)' },
  pro:   { bg: 'rgba(139,92,246,0.15)',   color: '#a78bfa',  border: 'rgba(139,92,246,0.3)'   },
  admin: { bg: 'rgba(239,68,68,0.15)',    color: '#f87171',  border: 'rgba(239,68,68,0.3)'    },
}

function StatCard({ label, value, color, sub }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }} transition={{ ease }}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16, padding: '20px 22px',
      }}>
      <div style={{ fontSize: 32, fontWeight: 900, color, letterSpacing: '-0.05em', fontFamily: 'monospace', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', marginTop: 3 }}>{sub}</div>}
    </motion.div>
  )
}

export default function Admin() {
  const [subscribers, setSubscribers] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [updatingId, setUpdatingId] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('subscribers')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setSubscribers(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = subscribers.filter(s => {
    const matchSearch = s.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || s.role === roleFilter
    return matchSearch && matchRole
  })

  const cycleRole = async (sub) => {
    const next = ROLES[(ROLES.indexOf(sub.role || 'user') + 1) % ROLES.length]
    setUpdatingId(sub.id)
    // Optimistic update
    setSubscribers(prev => prev.map(s => s.id === sub.id ? { ...s, role: next } : s))
    const { error } = await supabase.from('subscribers').update({ role: next }).eq('id', sub.id)
    if (error) {
      setSubscribers(prev => prev.map(s => s.id === sub.id ? { ...s, role: sub.role } : s))
      showToast('Failed to update role', 'error')
    } else {
      showToast(`${sub.email.split('@')[0]} → ${next}`)
    }
    setUpdatingId(null)
  }

  const copyEmails = () => {
    const emails = filtered.map(s => s.email).join(', ')
    navigator.clipboard.writeText(emails).then(() => {
      setCopied(true)
      showToast(`${filtered.length} email${filtered.length !== 1 ? 's' : ''} copied`)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const downloadCSV = () => {
    const header = ['email', 'role', 'source', 'joined'].join(',')
    const rows = filtered.map(s => [
      `"${s.email}"`,
      s.role || 'user',
      s.source || 'signup',
      new Date(s.created_at).toLocaleDateString(),
    ].join(','))
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `clutch-subscribers-${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
    showToast('CSV downloaded — your backup is safe ✓')
  }

  const fmt = (ts) => {
    if (!ts) return '—'
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const thisMonth = subscribers.filter(s => new Date(s.created_at) > new Date(Date.now() - 30 * 86400000)).length
  const adminCount = subscribers.filter(s => s.role === 'admin').length
  const proCount   = subscribers.filter(s => s.role === 'pro').length

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px 120px', color: '#fff', position: 'relative' }}>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            style={{
              position: 'fixed', top: 86, right: 20, zIndex: 999,
              background: toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(52,211,153,0.15)',
              border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(52,211,153,0.3)'}`,
              color: toast.type === 'error' ? '#f87171' : '#34d399',
              padding: '10px 16px', borderRadius: 12,
              fontSize: 12, fontWeight: 700,
            }}>
            {toast.type === 'error' ? '✕ ' : '✓ '}{toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 9, fontWeight: 900, color: '#ef4444', letterSpacing: '0.28em', fontFamily: 'monospace', marginBottom: 10 }}>⚡ ADMIN PANEL</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 900, letterSpacing: '-0.045em', color: 'white', margin: '0 0 6px' }}>User Management</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Every signup is auto-captured. Data lives in Supabase — never lost on refresh.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={load}
              style={{ padding: '9px 16px', borderRadius: 10, fontSize: 11, fontWeight: 800, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', letterSpacing: '0.08em' }}>
              ↻ Refresh
            </motion.button>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={downloadCSV}
              style={{ padding: '9px 16px', borderRadius: 10, fontSize: 11, fontWeight: 800, background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)', cursor: 'pointer', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Export CSV
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
        <StatCard label="Total Users" value={subscribers.length} color="#3b82f6" />
        <StatCard label="This Month" value={thisMonth} color="#34d399" sub={thisMonth > 0 ? `+${thisMonth} new` : 'No new signups'} />
        <StatCard label="Pro Users" value={proCount} color="#a78bfa" />
        <StatCard label="Admins" value={adminCount} color="#f87171" />
        <StatCard label="Showing" value={filtered.length} color="#fb923c" />
      </div>

      {/* Toolbar */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, ease }}
        style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.3)" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email..."
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px 10px 34px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#3b82f660'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
        </div>

        {/* Role filter pills */}
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', ...ROLES].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              style={{
                padding: '8px 14px', borderRadius: 9, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
                textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s',
                background: roleFilter === r ? (r === 'all' ? 'rgba(59,130,246,0.2)' : ROLE_STYLE[r]?.bg) : 'rgba(255,255,255,0.04)',
                color: roleFilter === r ? (r === 'all' ? '#3b82f6' : ROLE_STYLE[r]?.color) : 'rgba(255,255,255,0.35)',
                border: `1px solid ${roleFilter === r ? (r === 'all' ? 'rgba(59,130,246,0.3)' : ROLE_STYLE[r]?.border) : 'rgba(255,255,255,0.07)'}`,
              }}>
              {r}
            </button>
          ))}
        </div>

        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={copyEmails}
          style={{ padding: '9px 16px', borderRadius: 10, fontSize: 11, fontWeight: 800, background: copied ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.05)', color: copied ? '#34d399' : 'rgba(255,255,255,0.5)', border: `1px solid ${copied ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.07)'}`, cursor: 'pointer', letterSpacing: '0.08em', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
          {copied ? '✓ Copied!' : 'Copy Emails'}
        </motion.button>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, ease }}
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden' }}>

        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 120px 100px', padding: '11px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.025)' }}>
          {['Email', 'Role', 'Joined', 'Source'].map((h, i) => (
            <div key={i} style={{ fontSize: 8, fontWeight: 900, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ width: 28, height: 28, border: '2px solid rgba(59,130,246,0.2)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Loading subscribers...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '52px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>📭</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>{search ? 'No matches found' : 'No subscribers yet'}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)', marginTop: 6 }}>New sign-ups appear here automatically</div>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((sub, i) => {
              const rs = ROLE_STYLE[sub.role || 'user']
              return (
                <motion.div key={sub.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ delay: Math.min(i * 0.025, 0.3), ease }}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 110px 120px 100px',
                    padding: '13px 20px',
                    borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    transition: 'background 0.15s', alignItems: 'center',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}>

                  {/* Email */}
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 16 }}>
                    {sub.email}
                  </div>

                  {/* Role badge — click to cycle */}
                  <motion.button
                    whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
                    onClick={() => cycleRole(sub)}
                    disabled={updatingId === sub.id}
                    title="Click to change role"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 9, fontWeight: 900, letterSpacing: '0.14em',
                      textTransform: 'uppercase', padding: '4px 10px', borderRadius: 6,
                      background: rs.bg, color: rs.color, border: `1px solid ${rs.border}`,
                      cursor: 'pointer', transition: 'all 0.2s',
                      opacity: updatingId === sub.id ? 0.5 : 1,
                    }}>
                    {updatingId === sub.id ? '…' : (sub.role || 'user')}
                  </motion.button>

                  {/* Joined */}
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>{fmt(sub.created_at)}</div>

                  {/* Source */}
                  <div>
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 5, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.18)', textTransform: 'uppercase' }}>
                      {sub.source || 'signup'}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </motion.div>

      {filtered.length > 0 && (
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', marginTop: 10, textAlign: 'right' }}>
          {filtered.length} of {subscribers.length} user{subscribers.length !== 1 ? 's' : ''} — click a role badge to change it
        </p>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
