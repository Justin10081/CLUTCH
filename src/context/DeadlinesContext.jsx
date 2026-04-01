import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from './AuthContext'

const DeadlinesContext = createContext(null)
const LS_KEY = 'clutch-deadlines'

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}

// DB row → local camelCase
function fromDB(row) {
  return {
    id: row.id,
    title: row.title || '',
    course: row.course_name || '',
    courseId: row.course_id || '',
    courseColor: row.course_color || '#3b82f6',
    date: row.due_date ? row.due_date.slice(0, 10) : '',
    weight: row.weight ?? 5,
    difficulty: row.difficulty ?? 5,
    type: row.type || 'assignment',
    completed: row.completed || false,
    fromSyllabus: row.from_syllabus || false,
  }
}

// Strip characters PostgreSQL rejects: non-BMP emoji, lone surrogates, null bytes.
// Character-by-character to avoid esbuild mangling /gu Unicode regex patterns.
function sanitize(s) {
  if (typeof s !== 'string') return s
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c === 0) continue
    if (c >= 0xD800 && c <= 0xDBFF) {
      const next = i + 1 < s.length ? s.charCodeAt(i + 1) : 0
      if (next >= 0xDC00 && next <= 0xDFFF) i++
      continue
    }
    if (c >= 0xDC00 && c <= 0xDFFF) continue
    out += s[i]
  }
  return out
}

// Local camelCase → DB row
function toDB(d, userId) {
  return {
    id: d.id,
    user_id: userId,
    title: sanitize(d.title) || '',
    course_name: sanitize(d.course) || '',
    course_id: d.courseId || null,
    course_color: sanitize(d.courseColor) || '#3b82f6',
    due_date: d.date || null,
    weight: d.weight ?? 5,
    difficulty: d.difficulty ?? 5,
    type: d.type || 'assignment',
    completed: d.completed || false,
    from_syllabus: d.fromSyllabus || false,
  }
}

export function DeadlinesProvider({ children }) {
  const { user, loading } = useAuth()
  const [deadlines, setDeadlinesState] = useState(load)
  const syncRef = useRef(null)
  const userRef = useRef(user)

  useEffect(() => { userRef.current = user }, [user])

  // Clear in-memory state when user logs out — but NOT during initial auth load.
  // Keep localStorage intact so recovery sync can restore data on next login.
  useEffect(() => {
    if (!loading && !user) {
      setDeadlinesState([])
    }
  }, [user, loading])

  // Load from Supabase on auth
  useEffect(() => {
    if (!user || user.demo || !isSupabaseConfigured()) return

    // Immediately restore from localStorage so deadlines show before Supabase responds
    const localSnapshot = load()
    if (localSnapshot.length > 0) setDeadlinesState(localSnapshot)

    supabase
      .from('deadlines')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('Supabase deadlines load error:', error)
          return // Keep localStorage state on DB error
        }
        if (!data) return

        // Recovery: if Supabase empty but localStorage has data, sync up
        if (data.length === 0) {
          const localDeadlines = load()
          if (localDeadlines.length > 0) {
            // Restore state from localStorage (useState only runs on first mount)
            setDeadlinesState(localDeadlines)
            supabase
              .from('deadlines')
              .upsert(localDeadlines.map(d => toDB(d, user.id)), { onConflict: 'id' })
              .then(({ error: e }) => { if (e) console.error('Deadline recovery sync error:', e) })
            return
          }
          setDeadlinesState([])
          return
        }

        const mapped = data.map(fromDB)
        setDeadlinesState(mapped)
        setTimeout(() => {
          try { localStorage.setItem(LS_KEY, JSON.stringify(mapped)) } catch (_) {}
        }, 0)
      })
  }, [user?.id])

  // Debounced full Supabase sync — upserts all + deletes removed
  const queueSync = useCallback((newDeadlines) => {
    const u = userRef.current
    if (!u || u.demo || !isSupabaseConfigured()) return
    if (syncRef.current) clearTimeout(syncRef.current)
    syncRef.current = setTimeout(async () => {
      try {
        if (newDeadlines.length > 0) {
          await supabase
            .from('deadlines')
            .upsert(newDeadlines.map(d => toDB(d, u.id)), { onConflict: 'id' })
        }
        const { data: existing } = await supabase
          .from('deadlines')
          .select('id')
          .eq('user_id', u.id)
        if (existing) {
          const newIds = new Set(newDeadlines.map(d => d.id))
          const toDelete = existing.filter(e => !newIds.has(e.id)).map(e => e.id)
          if (toDelete.length > 0) {
            await supabase.from('deadlines').delete().in('id', toDelete)
          }
        }
      } catch (err) {
        console.error('Supabase deadlines sync error:', err)
      }
    }, 1500)
  }, [])

  // Drop-in replacement for useState setter — same API as before
  const setDeadlines = useCallback((updater) => {
    setDeadlinesState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      setTimeout(() => {
        try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch (_) {}
      }, 0)
      queueSync(next)
      return next
    })
  }, [queueSync])

  // Convenience method: add a single deadline (used by CourseDetail syllabus parser)
  const addDeadline = useCallback((data) => {
    const d = { id: crypto.randomUUID(), ...data }
    setDeadlines(prev => [...prev, d])
    return d
  }, [setDeadlines])

  // Batch-add multiple deadlines (used for syllabus import)
  const addDeadlines = useCallback((items) => {
    const newItems = items.map(d => ({ id: crypto.randomUUID(), ...d }))
    setDeadlines(prev => {
      const existingIds = new Set(prev.map(d => d.id))
      return [...prev, ...newItems.filter(d => !existingIds.has(d.id))]
    })
    return newItems
  }, [setDeadlines])

  // Replace all deadlines for a course (used when re-parsing syllabus)
  const replaceCourseSyllabusDeadlines = useCallback((courseId, newItems) => {
    setDeadlines(prev => {
      const kept = prev.filter(d => !(d.courseId === courseId && d.fromSyllabus))
      return [...kept, ...newItems]
    })
  }, [setDeadlines])

  // Remove all deadlines for a course (used when deleting a course)
  const removeDeadlinesByCourse = useCallback((courseId) => {
    setDeadlines(prev => prev.filter(d => d.courseId !== courseId))
  }, [setDeadlines])

  return (
    <DeadlinesContext.Provider value={{
      deadlines,
      setDeadlines,
      addDeadline,
      addDeadlines,
      replaceCourseSyllabusDeadlines,
      removeDeadlinesByCourse,
    }}>
      {children}
    </DeadlinesContext.Provider>
  )
}

export function useDeadlines() {
  const ctx = useContext(DeadlinesContext)
  if (!ctx) throw new Error('useDeadlines must be used within DeadlinesProvider')
  return ctx
}
