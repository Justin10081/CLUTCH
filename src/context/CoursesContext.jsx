import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from './AuthContext'

const CoursesContext = createContext(null)
const LS_KEY = 'clutch-courses'

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}

// DB row → local camelCase
function fromDB(row) {
  return {
    id: row.id,
    name: row.name || '',
    code: row.code || '',
    professor: row.professor || '',
    credits: row.credits || 3,
    color: row.color || '#3b82f6',
    semester: row.semester || '',
    targetGrade: row.target_grade || 'B+',
    syllabus: row.syllabus || null,
    syllabusName: row.syllabus_name || null,
    syllabusData: row.syllabus_data || null,
    materials: [],
    createdAt: row.created_at ? Date.parse(row.created_at) : Date.now(),
  }
}

// Local camelCase → DB columns for INSERT (no syllabus_data — let it default to null)
function toDB(c, userId) {
  const san = (s) => typeof s === 'string' ? sanitizeForDB(s) : s
  const row = {
    id: c.id,
    name: san(c.name) || '',
    code: san(c.code) || '',
    professor: san(c.professor) || '',
    credits: c.credits || 3,
    color: san(c.color) || '#3b82f6',
    semester: san(c.semester) || '',
    target_grade: san(c.targetGrade) || 'B+',
    syllabus: c.syllabus ? san(c.syllabus) : null,
    syllabus_name: c.syllabusName ? san(c.syllabusName) : null,
    // syllabus_data intentionally omitted from INSERT — updated separately via updateCourse
  }
  if (userId) row.user_id = userId
  return row
}

// Remove characters that PostgreSQL rejects: non-BMP (emoji/surrogate pairs) and null bytes.
// Uses a character-by-character loop instead of regex to avoid esbuild mangling /gu Unicode patterns.
function sanitizeForDB(val) {
  if (typeof val === 'string') {
    let out = ''
    for (let i = 0; i < val.length; i++) {
      const c = val.charCodeAt(i)
      if (c === 0) continue                          // null byte
      if (c >= 0xD800 && c <= 0xDBFF) {             // high surrogate
        const next = i + 1 < val.length ? val.charCodeAt(i + 1) : 0
        if (next >= 0xDC00 && next <= 0xDFFF) i++   // valid pair — skip both halves
        continue
      }
      if (c >= 0xDC00 && c <= 0xDFFF) continue      // lone low surrogate
      out += val[i]
    }
    return out
  }
  if (Array.isArray(val)) return val.map(sanitizeForDB)
  if (val !== null && typeof val === 'object') {
    return Object.fromEntries(Object.entries(val).map(([k, v]) => [k, sanitizeForDB(v)]))
  }
  return val
}

// Full row for upsert (includes syllabus_data)
function toDBFull(c, userId) {
  const row = toDB(c, userId)
  row.syllabus_data = c.syllabusData ? sanitizeForDB(c.syllabusData) : null
  return row
}

function materialFromDB(row) {
  return {
    id: row.id,
    name: row.name || '',
    content: row.content || '',
    type: row.file_type || 'text',
    size: row.file_size || 0,
    uploadedAt: row.created_at ? Date.parse(row.created_at) : Date.now(),
  }
}

export function CoursesProvider({ children }) {
  const { user, loading } = useAuth()
  const [courses, setCourses] = useState(load)
  const userRef = useRef(user)

  useEffect(() => { userRef.current = user }, [user])

  // Clear in-memory state when user logs out — but NOT during initial auth load.
  // We intentionally keep localStorage intact so the recovery sync can push it
  // to Supabase on the next login (handles the case where Supabase writes failed).
  useEffect(() => {
    if (!loading && !user) {
      setCourses([])
    }
  }, [user, loading])

  // Load from Supabase on auth
  useEffect(() => {
    if (!user || user.demo || !isSupabaseConfigured()) return

    // Immediately restore from localStorage so courses show before Supabase responds
    const localSnapshot = load()
    if (localSnapshot.length > 0) setCourses(localSnapshot)

    supabase
      .from('courses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then(async ({ data: coursesData, error }) => {
        if (error) {
          console.error('Supabase courses load error:', error)
          return // Keep localStorage state on DB error
        }
        if (!coursesData) return

        // ── Recovery sync ────────────────────────────────────────────────────
        // If Supabase has no courses but localStorage does, the previous
        // INSERT must have failed. Recover by upserting all local courses now.
        if (coursesData.length === 0) {
          const localCourses = load()
          if (localCourses.length > 0) {
            // Restore state from localStorage (useState(load) only runs on first mount,
            // so after logout+login on the same page the state is [] — fix it here)
            setCourses(localCourses)
            // Push to Supabase in the background
            Promise.all(localCourses.map(async c => {
              const { error: e1 } = await supabase
                .from('courses')
                .insert(toDB(c, user.id))
              if (e1) {
                if (e1.code !== '23505') { console.error('Recovery core insert error:', e1); return }
                // Row already exists — update it instead
                const { error: eu } = await supabase
                  .from('courses')
                  .update(toDB(c, user.id))
                  .eq('id', c.id)
                  .eq('user_id', user.id)
                if (eu) { console.error('Recovery core update error:', eu); return }
              }
              if (c.syllabusData) {
                const { error: e2 } = await supabase
                  .from('courses')
                  .update({ syllabus_data: sanitizeForDB(c.syllabusData), syllabus_name: c.syllabusName || null })
                  .eq('id', c.id)
                  .eq('user_id', user.id)
                if (e2) console.error('Recovery syllabus update error:', e2)
              }
            }))
            return
          }
          // Both Supabase and localStorage are empty — genuinely no courses
          setCourses([])
          return
        }
        // ────────────────────────────────────────────────────────────────────

        const courseIds = coursesData.map(c => c.id)
        let materialsMap = {}

        if (courseIds.length > 0) {
          const { data: materialsData } = await supabase
            .from('course_materials')
            .select('*')
            .in('course_id', courseIds)

          if (materialsData) {
            materialsData.forEach(m => {
              if (!materialsMap[m.course_id]) materialsMap[m.course_id] = []
              materialsMap[m.course_id].push(materialFromDB(m))
            })
          }
        }

        const mapped = coursesData.map(c => ({
          ...fromDB(c),
          materials: materialsMap[c.id] || [],
        }))

        setCourses(mapped)
        setTimeout(() => {
          try { localStorage.setItem(LS_KEY, JSON.stringify(mapped)) } catch (_) {}
        }, 0)
      })
  }, [user?.id])

  const persist = useCallback((updater) => {
    setCourses(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      setTimeout(() => {
        try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch (_) {}
      }, 0)
      return next
    })
  }, [])

  const addCourse = useCallback(async (data) => {
    const course = {
      id: crypto.randomUUID(),
      name: '',
      code: '',
      professor: '',
      credits: 3,
      color: '#3b82f6',
      semester: '',
      targetGrade: 'B+',
      syllabus: null,
      syllabusName: null,
      syllabusData: null,
      materials: [],
      createdAt: Date.now(),
      ...data,
    }
    persist(prev => [...prev, course])

    const u = userRef.current
    if (u && !u.demo && isSupabaseConfigured()) {
      const { error } = await supabase
        .from('courses')
        .insert(toDB(course, u.id))
      if (error) {
        console.error('Supabase course insert error:', error.message, error.details, error.hint)
        // Fallback: try upsert in case the row somehow already exists
        if (error.code === '23505') {
          const { error: e2 } = await supabase
            .from('courses')
            .upsert(toDB(course, u.id), { onConflict: 'id' })
          if (e2) console.error('Supabase course upsert fallback error:', e2.message, e2.details)
        }
      }
    }

    return course
  }, [persist])

  const updateCourse = useCallback(async (id, changes) => {
    let updatedCourse = null
    persist(prev => {
      const next = prev.map(c => {
        if (c.id !== id) return c
        updatedCourse = { ...c, ...changes }
        return updatedCourse
      })
      return next
    })

    const u = userRef.current
    if (u && !u.demo && isSupabaseConfigured()) {
      // Use upsert so even if the original INSERT failed, this write succeeds.
      // We need the full merged course object — read it from state via closure above.
      // Build a complete upsert row after a tick (so persist has run).
      await new Promise(r => setTimeout(r, 0))

      // Re-read from state to get the latest merged value
      const dbChanges = {}
      const san = (s) => typeof s === 'string' ? sanitizeForDB(s) : s
      if ('name' in changes) dbChanges.name = san(changes.name)
      if ('code' in changes) dbChanges.code = san(changes.code)
      if ('professor' in changes) dbChanges.professor = san(changes.professor)
      if ('credits' in changes) dbChanges.credits = changes.credits
      if ('color' in changes) dbChanges.color = san(changes.color)
      if ('semester' in changes) dbChanges.semester = san(changes.semester)
      if ('targetGrade' in changes) dbChanges.target_grade = san(changes.targetGrade)
      if ('syllabus' in changes) dbChanges.syllabus = changes.syllabus ? san(changes.syllabus) : null
      if ('syllabusName' in changes) dbChanges.syllabus_name = changes.syllabusName ? san(changes.syllabusName) : null
      if ('syllabusData' in changes) dbChanges.syllabus_data = changes.syllabusData ? sanitizeForDB(changes.syllabusData) : null

      if (Object.keys(dbChanges).length === 0) return

      // First try a regular update — fast path for existing rows
      const { error: updateErr } = await supabase.from('courses').update(dbChanges).eq('id', id).eq('user_id', u.id)

      if (updateErr) {
        console.error('Supabase course update error:', updateErr)
        // Fallback: upsert the full row in case the row doesn't exist yet
        if (updatedCourse) {
          const { error: upsertErr } = await supabase
            .from('courses')
            .upsert(toDBFull(updatedCourse, u.id), { onConflict: 'id' })
          if (upsertErr) console.error('Supabase course upsert error:', upsertErr)
        }
      }
    }
  }, [persist])

  const deleteCourse = useCallback(async (id) => {
    persist(prev => prev.filter(c => c.id !== id))

    const u = userRef.current
    if (u && !u.demo && isSupabaseConfigured()) {
      const { error } = await supabase.from('courses').delete().eq('id', id)
      if (error) console.error('Supabase course delete error:', error)
    }
  }, [persist])

  const addMaterial = useCallback(async (courseId, material) => {
    const newMaterial = {
      id: crypto.randomUUID(),
      ...material,
      uploadedAt: Date.now(),
    }
    persist(prev => prev.map(c =>
      c.id === courseId
        ? { ...c, materials: [...(c.materials || []), newMaterial] }
        : c
    ))

    const u = userRef.current
    if (u && !u.demo && isSupabaseConfigured()) {
      const { error } = await supabase.from('course_materials').insert({
        id: newMaterial.id,
        course_id: courseId,
        user_id: u.id,
        name: newMaterial.name || '',
        content: (newMaterial.content || '').slice(0, 50000),
        file_type: newMaterial.type || 'text',
        file_size: newMaterial.size || 0,
      })
      if (error) console.error('Supabase material insert error:', error)
    }

    return newMaterial
  }, [persist])

  const removeMaterial = useCallback(async (courseId, materialId) => {
    persist(prev => prev.map(c =>
      c.id === courseId
        ? { ...c, materials: (c.materials || []).filter(m => m.id !== materialId) }
        : c
    ))

    const u = userRef.current
    if (u && !u.demo && isSupabaseConfigured()) {
      const { error } = await supabase.from('course_materials').delete().eq('id', materialId)
      if (error) console.error('Supabase material delete error:', error)
    }
  }, [persist])

  return (
    <CoursesContext.Provider value={{ courses, addCourse, updateCourse, deleteCourse, addMaterial, removeMaterial }}>
      {children}
    </CoursesContext.Provider>
  )
}

export function useCourses() {
  const ctx = useContext(CoursesContext)
  if (!ctx) throw new Error('useCourses must be used within CoursesProvider')
  return ctx
}
