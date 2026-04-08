import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '../context/AuthContext'
import { useSessions } from '../context/SessionsContext'
import { supabase } from '../lib/supabase'

// ── Demo data ──────────────────────────────────────────────────────────────────
const DEMO_STUDENTS = [
  { id: 1, name: 'Aisha Kamara',  initials: 'AK', major: 'Pre-Med',      hours: 52.3, streak: 14, sessions: 31, delta: +2, color: '#3b82f6', badges: ['marathon','streak','top','night_owl'] },
  { id: 2, name: 'Marcus Chen',   initials: 'MC', major: 'CS',           hours: 44.1, streak: 9,  sessions: 26, delta: -1, color: '#8b5cf6', badges: ['streak','clutch','speed'] },
  { id: 3, name: 'Sofia Reyes',   initials: 'SR', major: 'Finance',      hours: 38.7, streak: 7,  sessions: 22, delta: +1, color: '#06b6d4', badges: ['marathon','target'] },
  { id: 4, name: 'Jordan Park',   initials: 'JP', major: 'Engineering',  hours: 35.2, streak: 5,  sessions: 19, delta:  0, color: '#f59e0b', badges: ['night_owl','clutch'] },
  { id: 5, name: 'Nadia Osei',    initials: 'NO', major: 'Psychology',   hours: 29.8, streak: 4,  sessions: 16, delta: +3, color: '#ec4899', badges: ['target'] },
  { id: 6, name: 'Tyler Russo',   initials: 'TR', major: 'Business',     hours: 25.4, streak: 3,  sessions: 14, delta: -2, color: '#10b981', badges: ['speed'] },
  { id: 7, name: 'Priya Singh',   initials: 'PS', major: 'Biology',      hours: 21.0, streak: 2,  sessions: 11, delta: +1, color: '#f97316', badges: [] },
  { id: 8, name: 'Alex Morgan',   initials: 'AM', major: 'Communications',hours: 17.3, streak: 1,  sessions: 9,  delta: -1, color: '#6366f1', badges: [] },
  { id: 9, name: 'Kai Williams',  initials: 'KW', major: 'Mathematics',  hours: 13.1, streak: 0,  sessions: 6,  delta:  0, color: '#14b8a6', badges: [] },
]

const LIVE_NOW = [
  { initials: 'AK', name: 'Aisha',   subject: 'Biochemistry',     mins: 18, color: '#3b82f6' },
  { initials: 'MC', name: 'Marcus',  subject: 'Algorithms',        mins: 42, color: '#8b5cf6' },
  { initials: 'JP', name: 'Jordan',  subject: 'Thermodynamics',    mins: 7,  color: '#f59e0b' },
  { initials: 'NO', name: 'Nadia',   subject: 'Statistics',        mins: 61, color: '#ec4899' },
  { initials: 'SR', name: 'Sofia',   subject: 'Financial Modeling',mins: 29, color: '#06b6d4' },
]

const ACHIEVEMENTS = [
  { id: 'marathon',  icon: '📚', label: 'Marathon',     desc: '25+ hours in a week',    color: '#3b82f6' },
  { id: 'streak',    icon: '🔥', label: 'On Fire',      desc: '7-day study streak',      color: '#f97316' },
  { id: 'clutch',    icon: '⚡', label: 'Clutch Mode',  desc: '10+ AI study sessions',  color: '#eab308' },
  { id: 'night_owl', icon: '🌙', label: 'Night Owl',    desc: 'Studied past midnight',   color: '#8b5cf6' },
  { id: 'top',       icon: '🏆', label: 'Top Scholar',  desc: '#1 on the leaderboard',  color: '#f59e0b' },
  { id: 'speed',     icon: '💨', label: 'Speed Run',    desc: '5 sessions in one day',  color: '#06b6d4' },
  { id: 'target',    icon: '🎯', label: 'On Target',    desc: 'Zero missed deadlines',  color: '#10b981' },
  { id: 'diamond',   icon: '💎', label: 'Diamond',      desc: '30-day study streak',    color: '#a78bfa' },
]

const WEEK = Math.ceil((Date.now() - new Date(new Date().getFullYear(), 0, 1)) / 604800000)

// ── Sub-components ─────────────────────────────────────────────────────────────
function Avatar({ initials, color, size = 40, glow = false, pulse = false }) {
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `radial-gradient(135deg, ${color}33, ${color}11)`,
        border: `1.5px solid ${color}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.32, fontWeight: 800, color: color,
        letterSpacing: '-0.02em',
        boxShadow: glow ? `0 0 20px ${color}44` : 'none',
      }}>
        {initials}
      </div>
      {pulse && (
        <div style={{
          position: 'absolute', bottom: 1, right: 1,
          width: 9, height: 9, borderRadius: '50%',
          backgroundColor: '#22c55e',
          boxShadow: '0 0 8px rgba(34,197,94,0.8)',
          border: '1.5px solid #080a0e',
          animation: 'social-pulse 2s ease-in-out infinite',
        }} />
      )}
    </div>
  )
}

function BadgePip({ id }) {
  const badge = ACHIEVEMENTS.find(a => a.id === id)
  if (!badge) return null
  return (
    <span title={badge.label} style={{
      fontSize: 12, lineHeight: 1, display: 'inline-block',
      filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.2))',
    }}>{badge.icon}</span>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function Social() {
  const { user } = useAuth()
  const { sessions: storedSessions, sessionCount } = useSessions()
  const [hoveredRow, setHoveredRow] = useState(null)
  const [challenged, setChallenged] = useState(null)
  const [friendInput, setFriendInput] = useState('')
  const [addingFriend, setAddingFriend] = useState(false)
  const [friendSent, setFriendSent] = useState(false)
  const [tab, setTab] = useState('week')
  const [expandedRow, setExpandedRow] = useState(null)
  const tickRef = useRef(null)
  const [liveMins, setLiveMins] = useState(LIVE_NOW.map(u => u.mins))
  const [realData, setRealData] = useState(null)

  // Fetch real leaderboard from Supabase RPC
  useEffect(() => {
    if (!supabase) return
    supabase.rpc('get_leaderboard').then(({ data, error }) => {
      if (!error && Array.isArray(data) && data.length > 0) {
        setRealData(data)
      }
    })
  }, [])

  // Live "studying" timer tick
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setLiveMins(prev => prev.map(m => m + 1))
    }, 60000)
    return () => clearInterval(tickRef.current)
  }, [])

  // User's real stats from SessionsContext
  const userHours = parseFloat(Math.min(storedSessions.length * 1.4, 30).toFixed(1))
  const userStreak = Math.min(sessionCount, 4)
  const userName = user?.email?.split('@')[0] || 'you'
  const userInitials = (userName[0] || 'Y').toUpperCase() + (userName[1] || '').toUpperCase()
  const userBadges = sessionCount >= 10 ? ['clutch'] : []

  // Build leaderboard from real or demo data
  const BASE_STUDENTS = realData
    ? realData.map((r, i) => ({
        id: i + 1,
        name: r.display_name,
        initials: r.initials,
        major: '',
        hours: Math.round((r.session_count || 0) * 1.4 * 10) / 10,
        streak: Math.min(Math.floor((r.session_count || 0) / 3), 30),
        sessions: Number(r.session_count || 0),
        delta: 0,
        color: r.color || '#3b82f6',
        badges: (r.session_count || 0) >= 10 ? ['clutch'] : [],
      }))
    : DEMO_STUDENTS

  const score = s => s.hours * 2 + s.streak * 1.5 + s.sessions * 0.5
  const userScore = score({ hours: userHours, streak: userStreak, sessions: sessionCount })
  const rankPos = BASE_STUDENTS.filter(s => score(s) > userScore).length
  const ME = {
    id: 'me', name: userName, initials: userInitials, major: 'Your Major',
    hours: userHours, streak: userStreak, sessions: sessionCount, delta: 0,
    color: '#3b82f6', badges: userBadges, isMe: true,
  }
  const leaderboard = [...BASE_STUDENTS.slice(0, rankPos), ME, ...BASE_STUDENTS.slice(rankPos)]
  const myRank = leaderboard.findIndex(s => s.isMe) + 1
  const maxHours = Math.max(...leaderboard.map(s => s.hours), 1)

  // Friends
  const [friends, setFriends] = useState(() => {
    try { return JSON.parse(localStorage.getItem('clutch-friends') || '[]') } catch { return [] }
  })

  const handleChallenge = (id) => {
    setChallenged(id)
    setTimeout(() => setChallenged(null), 2800)
  }

  const handleAddFriend = () => {
    if (!friendInput.trim()) return
    const updated = [...friends, { name: friendInput.trim(), id: Date.now() }]
    setFriends(updated)
    localStorage.setItem('clutch-friends', JSON.stringify(updated))
    setFriendInput('')
    setFriendSent(true)
    setTimeout(() => { setFriendSent(false); setAddingFriend(false) }, 2000)
  }

  const removeFriend = (id) => {
    const updated = friends.filter(f => f.id !== id)
    setFriends(updated)
    localStorage.setItem('clutch-friends', JSON.stringify(updated))
  }

  const rankLabel = (n) => {
    if (n === 1) return { text: '01', color: '#f59e0b' }
    if (n === 2) return { text: '02', color: '#94a3b8' }
    if (n === 3) return { text: '03', color: '#b45309' }
    return { text: String(n).padStart(2, '0'), color: 'rgba(255,255,255,0.15)' }
  }

  return (
    <div style={{ minHeight: '100vh', padding: '0 0 100px' }}>
      <style>{`
        @keyframes social-pulse {
          0%,100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.6; }
        }
        @keyframes social-live-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes social-ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .social-row:hover .challenge-btn { opacity: 1; transform: translateX(0); }
        .social-row .challenge-btn { opacity: 0; transform: translateX(8px); transition: opacity 0.2s, transform 0.2s; }
      `}</style>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(32px, 6vw, 60px) clamp(20px, 5vw, 48px) 0', position: 'relative', overflow: 'hidden' }}>
        {/* Ambient background */}
        <div style={{
          position: 'absolute', top: -100, right: -100, width: 600, height: 500,
          borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(ellipse, rgba(59,130,246,0.06) 0%, transparent 70%)',
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
          <div>
            {/* Editorial tag */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.1)',
                padding: '4px 10px', borderRadius: 4,
              }}>WEEK {WEEK}</div>
              <div style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase',
                color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)',
                padding: '4px 10px', borderRadius: 4, background: 'rgba(59,130,246,0.08)',
              }}>LEADERBOARD</div>
            </div>

            {/* Giant headline */}
            <h1 style={{
              fontSize: 'clamp(72px, 11vw, 140px)',
              fontWeight: 900,
              letterSpacing: '-0.055em',
              lineHeight: 0.88,
              margin: 0,
              color: 'white',
            }}>
              RANKED
              <span style={{ color: '#3b82f6' }}>.</span>
            </h1>
            <p style={{
              marginTop: 18, fontSize: 13, color: 'rgba(255,255,255,0.3)',
              fontWeight: 500, letterSpacing: '0.04em', maxWidth: 360,
            }}>
              Who's grinding hardest this semester. Study more, climb higher.
            </p>
          </div>

          {/* Right: your rank card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              background: 'rgba(59,130,246,0.06)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 16, padding: '24px 32px',
              minWidth: 220, textAlign: 'center',
            }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>YOUR RANK</div>
            <div style={{ fontSize: 72, fontWeight: 900, letterSpacing: '-0.04em', color: '#3b82f6', lineHeight: 1 }}>
              #{myRank}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 8 }}>
              {userHours}h this week · {userStreak} day streak
            </div>
          </motion.div>
        </div>

        {/* Tab filter */}
        <div style={{ display: 'flex', gap: 2, marginTop: 40, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 0 }}>
          {[['week', 'This Week'], ['month', 'This Month'], ['all', 'All Time']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              background: 'none', border: 'none', padding: '10px 20px',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: tab === key ? 'white' : 'rgba(255,255,255,0.28)',
              borderBottom: tab === key ? '2px solid #3b82f6' : '2px solid transparent',
              marginBottom: -1, transition: 'color 0.2s',
            }}>{label}</button>
          ))}
          <div style={{ flex: 1 }} />
          {/* Live count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px', paddingBottom: 12 }}>
            <div style={{ position: 'relative', width: 8, height: 8 }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', backgroundColor: '#22c55e', animation: 'social-live-ring 1.6s ease-out infinite' }} />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', backgroundColor: '#22c55e' }} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#22c55e' }}>
              {LIVE_NOW.length + 19} STUDYING NOW
            </span>
          </div>
        </div>
      </section>

      {/* ── LIVE NOW TICKER ──────────────────────────────────────────────────── */}
      <section style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* Label */}
          <div style={{
            flexShrink: 0, padding: '14px 20px',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            fontSize: 8, fontWeight: 800, letterSpacing: '0.3em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)',
            background: '#080a0e', zIndex: 2,
          }}>LIVE</div>

          {/* Scrolling ticker */}
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{
              display: 'flex', gap: 0,
              animation: 'social-ticker 28s linear infinite',
              width: 'max-content',
            }}>
              {[...LIVE_NOW, ...LIVE_NOW].map((u, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 28px', borderRight: '1px solid rgba(255,255,255,0.05)',
                  flexShrink: 0,
                }}>
                  <Avatar initials={u.initials} color={u.color} size={28} pulse />
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{u.name}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)' }}>{u.subject} · {liveMins[i % liveMins.length]}m</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 0, alignItems: 'start' }}>

        {/* ── LEADERBOARD ─────────────────────────────────────────────────── */}
        <section style={{ borderRight: '1px solid rgba(255,255,255,0.05)', minHeight: 600 }}>
          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '64px 48px 1fr 160px 80px 80px 60px',
            alignItems: 'center', gap: 16,
            padding: '16px clamp(20px, 5vw, 48px)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            {['RANK','','STUDENT','HOURS / WEEK','STREAK','SESSIONS',''].map((h, i) => (
              <div key={i} style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.18)' }}>{h}</div>
            ))}
          </div>

          {leaderboard.map((student, idx) => {
            const rank = idx + 1
            const rl = rankLabel(rank)
            const barW = Math.max((student.hours / maxHours) * 100, 2)
            const isMe = student.isMe
            const isTop3 = rank <= 3
            const isExpanded = expandedRow === student.id

            return (
              <motion.div
                key={student.id}
                className="social-row"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                onHoverStart={() => setHoveredRow(student.id)}
                onHoverEnd={() => setHoveredRow(null)}
                onClick={() => setExpandedRow(isExpanded ? null : student.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '64px 48px 1fr 160px 80px 80px 60px',
                  alignItems: 'center', gap: 16,
                  padding: '20px clamp(20px, 5vw, 48px)',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  borderLeft: isMe ? '2px solid #3b82f6' : hoveredRow === student.id ? '2px solid rgba(255,255,255,0.1)' : '2px solid transparent',
                  background: isMe
                    ? 'rgba(59,130,246,0.04)'
                    : hoveredRow === student.id ? 'rgba(255,255,255,0.02)' : 'transparent',
                  transition: 'background 0.2s, border-color 0.2s',
                  position: 'relative',
                }}>
                {/* Ghost rank number */}
                <div style={{
                  position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 64, fontWeight: 900, color: isTop3 ? `${rl.color}12` : 'rgba(255,255,255,0.025)',
                  letterSpacing: '-0.04em', lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
                }}>{rl.text}</div>

                {/* Rank */}
                <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: '-0.02em', color: rl.color, zIndex: 1 }}>
                  {rank === 1 && <span style={{ marginRight: 4 }}>🥇</span>}
                  {rank === 2 && <span style={{ marginRight: 4 }}>🥈</span>}
                  {rank === 3 && <span style={{ marginRight: 4 }}>🥉</span>}
                  {rank > 3 && `#${rank}`}
                </div>

                {/* Avatar */}
                <Avatar initials={student.initials} color={student.color} size={36} glow={isTop3} />

                {/* Name + meta */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: isMe ? 800 : 600, color: isMe ? 'white' : 'rgba(255,255,255,0.75)', letterSpacing: '-0.01em' }}>
                      {student.name}
                    </span>
                    {isMe && (
                      <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#3b82f6', background: 'rgba(59,130,246,0.12)', padding: '2px 6px', borderRadius: 3 }}>YOU</span>
                    )}
                    {student.delta !== 0 && (
                      <span style={{ fontSize: 10, color: student.delta > 0 ? '#22c55e' : '#ef4444' }}>
                        {student.delta > 0 ? `↑${student.delta}` : `↓${Math.abs(student.delta)}`}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginTop: 2 }}>
                    {student.major}
                  </div>
                </div>

                {/* Hours bar */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.7)', letterSpacing: '-0.02em' }}>{student.hours}h</span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barW}%` }}
                      transition={{ delay: idx * 0.04 + 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                      style={{ height: '100%', borderRadius: 2, background: isTop3 ? `linear-gradient(90deg, ${student.color}, ${student.color}99)` : `${student.color}88` }}
                    />
                  </div>
                </div>

                {/* Streak */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 14 }}>{student.streak > 0 ? '🔥' : '—'}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: student.streak > 0 ? '#f97316' : 'rgba(255,255,255,0.2)' }}>{student.streak}d</span>
                </div>

                {/* Sessions */}
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>
                  {student.sessions}
                  <span style={{ fontSize: 9, marginLeft: 2, color: 'rgba(255,255,255,0.2)' }}>sess</span>
                </div>

                {/* Badges + challenge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {student.badges.slice(0, 2).map(b => <BadgePip key={b} id={b} />)}
                  {!isMe && (
                    <button
                      className="challenge-btn"
                      onClick={e => { e.stopPropagation(); handleChallenge(student.id) }}
                      style={{
                        marginLeft: 4, background: challenged === student.id ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.1)',
                        border: `1px solid ${challenged === student.id ? 'rgba(34,197,94,0.3)' : 'rgba(59,130,246,0.25)'}`,
                        borderRadius: 6, padding: '3px 8px',
                        fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                        color: challenged === student.id ? '#22c55e' : '#3b82f6',
                        whiteSpace: 'nowrap',
                      }}>
                      {challenged === student.id ? '✓ SENT' : 'DUEL'}
                    </button>
                  )}
                </div>

                {/* Expanded detail row */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    style={{ gridColumn: '1 / -1', paddingTop: 12, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    {student.badges.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>BADGES</span>
                        {student.badges.map(b => {
                          const badge = ACHIEVEMENTS.find(a => a.id === b)
                          return badge ? (
                            <div key={b} style={{
                              display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                              background: `${badge.color}12`, border: `1px solid ${badge.color}33`,
                              borderRadius: 6, fontSize: 10, color: badge.color,
                            }}>
                              <span>{badge.icon}</span>
                              <span style={{ fontWeight: 700, letterSpacing: '0.06em' }}>{badge.label}</span>
                            </div>
                          ) : null
                        })}
                      </div>
                    )}
                    {student.badges.length === 0 && (
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>No badges yet — keep grinding</span>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </section>

        {/* ── RIGHT SIDEBAR ───────────────────────────────────────────────── */}
        <aside style={{ padding: '0', position: 'sticky', top: 76 }}>

          {/* Weekly challenge */}
          <div style={{ padding: '28px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 16 }}>WEEKLY CHALLENGE</div>
            <div style={{
              background: 'rgba(59,130,246,0.05)',
              border: '1px solid rgba(59,130,246,0.15)',
              borderRadius: 12, padding: '18px',
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: 4 }}>
                Grind Week ⚡
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>
                Study 20+ hours this week. Top 3 earn the Marathon badge.
              </div>
              {/* Progress */}
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span>Your progress</span>
                <span style={{ color: '#3b82f6', fontWeight: 700 }}>{userHours}h / 20h</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((userHours / 20) * 100, 100)}%` }}
                  transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6, #06b6d4)', borderRadius: 2 }}
                />
              </div>
              <div style={{ marginTop: 10, fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                Ends Sunday · {Math.max(0, (20 - userHours)).toFixed(1)}h to go
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div style={{ padding: '28px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 16 }}>ACHIEVEMENTS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {ACHIEVEMENTS.map(badge => {
                const unlocked = ME.badges.includes(badge.id)
                return (
                  <motion.div
                    key={badge.id}
                    whileHover={{ scale: 1.03 }}
                    style={{
                      padding: '12px',
                      background: unlocked ? `${badge.color}10` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${unlocked ? `${badge.color}30` : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: 10,
                      opacity: unlocked ? 1 : 0.5,
                      filter: unlocked ? 'none' : 'grayscale(1)',
                    }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{badge.icon}</div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: unlocked ? badge.color : 'rgba(255,255,255,0.4)', letterSpacing: '0.04em' }}>{badge.label}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>{badge.desc}</div>
                    {!unlocked && <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.15)', marginTop: 4 }}>LOCKED</div>}
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Friends */}
          <div style={{ padding: '28px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>FRIENDS</div>
              <button onClick={() => setAddingFriend(v => !v)} style={{
                background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: 6, padding: '4px 10px', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.06em', color: '#3b82f6',
              }}>+ ADD</button>
            </div>

            {/* Add friend input */}
            <AnimatePresence>
              {addingFriend && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      value={friendInput}
                      onChange={e => setFriendInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddFriend()}
                      placeholder="Enter name or email…"
                      autoFocus
                      style={{
                        flex: 1, background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                        padding: '8px 12px', fontSize: 11, color: 'white',
                        outline: 'none',
                      }}
                    />
                    <button onClick={handleAddFriend} style={{
                      background: '#3b82f6', border: 'none', borderRadius: 8,
                      padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'white',
                    }}>
                      {friendSent ? '✓' : 'Add'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Friend list */}
            {friends.length === 0 && !addingFriend && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>
                No friends added yet.<br />Add someone to track their progress.
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {friends.map(f => (
                <div key={f.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10,
                }}>
                  <Avatar initials={(f.name[0] || 'F').toUpperCase() + (f.name[1] || '').toUpperCase()} color="#6366f1" size={32} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{f.name}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>Friend · Invited</div>
                  </div>
                  <button onClick={() => removeFriend(f.id)} style={{
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)',
                    fontSize: 14, padding: '2px 4px',
                  }}>×</button>
                </div>
              ))}
            </div>

            {/* Share link */}
            <div style={{
              marginTop: 16, padding: '12px 14px',
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
            }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 6 }}>INVITE LINK</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div style={{ flex: 1, fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  clutch.app/join/...
                </div>
                <button
                  onClick={() => { navigator.clipboard?.writeText('https://clutch.app/join/demo') }}
                  style={{
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6, padding: '4px 8px', fontSize: 9, fontWeight: 700,
                    letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)',
                  }}>
                  COPY
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ── STATS BREAKDOWN ──────────────────────────────────────────────────── */}
      <section style={{
        margin: '0 48px', marginTop: 60,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingTop: 48,
      }}>
        <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 32 }}>
          COMMUNITY STATS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { label: 'Total Hours', value: `${leaderboard.reduce((a, s) => a + s.hours, 0).toFixed(0)}h`, sub: 'this week across all students', icon: '⏱' },
            { label: 'Study Sessions', value: leaderboard.reduce((a, s) => a + s.sessions, 0), sub: 'sessions completed total', icon: '📖' },
            { label: 'Avg Streak', value: `${(leaderboard.reduce((a, s) => a + s.streak, 0) / leaderboard.length).toFixed(1)}d`, sub: 'average study streak', icon: '🔥' },
            { label: 'Active Students', value: leaderboard.length, sub: 'competing this semester', icon: '👥' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 + 0.2 }}
              style={{
                padding: '24px', background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14,
              }}>
              <div style={{ fontSize: 20, marginBottom: 12 }}>{stat.icon}</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.04em', color: 'white', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>{stat.label}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', marginTop: 4 }}>{stat.sub}</div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}
