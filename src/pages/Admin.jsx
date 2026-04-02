import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { supabase } from '../lib/supabase'

const ease = [0.16, 1, 0.3, 1]

export default function Admin() {
  const [subscribers, setSubscribers] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase
      .from('subscribers')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setSubscribers(data || [])
        setLoading(false)
      })
  }, [])

  const filtered = subscribers.filter(s =>
    s.email?.toLowerCase().includes(search.toLowerCase())
  )

  const copyEmails = () => {
    const emails = filtered.map(s => s.email).join(', ')
    navigator.clipboard.writeText(emails).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const fmt = (ts) => {
    if (!ts) return '—'
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 120px', color: '#fff' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 9, fontWeight: 900, color: '#3b82f6', letterSpacing: '0.25em', fontFamily: 'monospace', marginBottom: 10 }}>ADMIN PANEL</div>
        <h1 style={{ fontSize: 'clamp(26px,4vw,38px)', fontWeight: 900, letterSpacing: '-0.04em', color: 'white', margin: '0 0 8px' }}>Mailing List</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0 }}>Every user who signs up is automatically added here.</p>
      </motion.div>

      {/* Stats row */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, ease }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Total Subscribers', value: subscribers.length, color: '#3b82f6' },
          { label: 'This Month', value: subscribers.filter(s => new Date(s.created_at) > new Date(Date.now() - 30 * 86400000)).length, color: '#34d399' },
          { label: 'Showing', value: filtered.length, color: '#8b5cf6' },
        ].map((stat, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: stat.color, letterSpacing: '-0.04em', fontFamily: 'monospace' }}>{stat.value}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Search + actions */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, ease }}
        style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by email..."
          style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none' }}
          onFocus={e => e.target.style.borderColor = '#3b82f660'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
        />
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={copyEmails}
          style={{ padding: '10px 18px', borderRadius: 10, fontSize: 12, fontWeight: 800, background: copied ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)', color: copied ? '#34d399' : 'rgba(255,255,255,0.6)', border: `1px solid ${copied ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', letterSpacing: '0.05em', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
          {copied ? '✓ Copied' : 'Copy Emails'}
        </motion.button>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, ease }}
        style={{ background: '#04060a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px', padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          {['Email', 'Joined', 'Source'].map((h, i) => (
            <div key={i} style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'monospace' }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Loading subscribers...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>{search ? 'No matches found' : 'No subscribers yet'}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 6 }}>New sign-ups will appear here automatically</div>
          </div>
        ) : (
          filtered.map((sub, i) => (
            <motion.div key={sub.id}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03, ease }}
              style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px', padding: '13px 20px', borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', transition: 'background 0.15s' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 16 }}>{sub.email}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{fmt(sub.created_at)}</div>
              <div>
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', padding: '3px 8px', borderRadius: 5, background: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', textTransform: 'uppercase' }}>
                  {sub.source || 'signup'}
                </span>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>

      {filtered.length > 0 && (
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 12, textAlign: 'right' }}>
          {filtered.length} subscriber{filtered.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
