import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from './AuthContext'

const SessionsContext = createContext(null)

function loadLocal() {
  try { return JSON.parse(localStorage.getItem('clutch-sessions') || '[]') } catch { return [] }
}
function loadCountLocal() {
  try { return parseInt(localStorage.getItem('clutch-session-count') || '0') } catch { return 0 }
}

function fromDB(row) {
  return {
    id: row.id,
    courseId: row.course_id || '',
    courseName: row.course_name || '',
    topic: row.topic || '',
    filesUsed: row.files_used || [],
    result: row.result || null,
    savedAt: row.created_at || new Date().toISOString(),
  }
}

export function SessionsProvider({ children }) {
  const { user, loading } = useAuth()
  const [sessions, setSessions] = useState(loadLocal)
  const [sessionCount, setSessionCount] = useState(loadCountLocal)
  const userRef = useRef(user)

  useEffect(() => { userRef.current = user }, [user])

  // Clear in-memory state when user logs out — but NOT during initial auth load.
  // Keep localStorage intact for recovery sync on next login.
  useEffect(() => {
    if (!loading && !user) {
      setSessions([])
      setSessionCount(0)
    }
  }, [user, loading])

  // Load from Supabase on auth
  useEffect(() => {
    if (!user || user.demo || !isSupabaseConfigured()) return
    supabase
      .from('study_sessions')
      .select('id, course_id, course_name, topic, files_used, result, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error && data) {
          const mapped = data.map(fromDB)
          setSessions(mapped)
          setSessionCount(mapped.length)
          setTimeout(() => {
            try {
              localStorage.setItem('clutch-sessions', JSON.stringify(mapped))
              localStorage.setItem('clutch-session-count', mapped.length.toString())
            } catch (_) {}
          }, 0)
        }
      })
  }, [user?.id])

  const addSession = useCallback(({ courseId, courseName, topic, filesUsed, result }) => {
    const session = {
      id: crypto.randomUUID(),
      courseId: courseId || '',
      courseName: courseName || '',
      topic: topic || '',
      filesUsed: filesUsed || [],
      result: result || null,
      savedAt: new Date().toISOString(),
    }

    setSessions(prev => {
      const next = [session, ...prev].slice(0, 50)
      setTimeout(() => {
        try { localStorage.setItem('clutch-sessions', JSON.stringify(next)) } catch (_) {}
      }, 0)
      return next
    })

    setSessionCount(prev => {
      const next = prev + 1
      setTimeout(() => {
        try { localStorage.setItem('clutch-session-count', next.toString()) } catch (_) {}
      }, 0)
      return next
    })

    // Async Supabase insert
    const u = userRef.current
    if (u && !u.demo && isSupabaseConfigured()) {
      supabase
        .from('study_sessions')
        .insert({
          id: session.id,
          user_id: u.id,
          course_id: courseId || null,
          course_name: courseName || '',
          topic: topic || '',
          files_used: filesUsed || [],
          result: result || null,
        })
        .then(({ error }) => {
          if (error) console.error('Supabase session insert error:', error)
        })
    }

    return session
  }, [])

  return (
    <SessionsContext.Provider value={{ sessions, sessionCount, addSession }}>
      {children}
    </SessionsContext.Provider>
  )
}

export function useSessions() {
  const ctx = useContext(SessionsContext)
  if (!ctx) throw new Error('useSessions must be used within SessionsProvider')
  return ctx
}
