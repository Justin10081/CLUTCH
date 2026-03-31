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

// Local camelCase → DB columns (no materials)
function toDB(c, userId) {
  const row = {
    id: c.id,
    name: c.name || '',
    code: c.code || '',
    professor: c.professor || '',
    credits: c.credits || 3,
    color: c.color || '#3b82f6',
    semester: c.semester || '',
    target_grade: c.targetGrade || 'B+',
    syllabus: c.syllabus || null,
    syllabus_name: c.syllabusName || null,
    syllabus_data: c.syllabusData || null,
  }
  if (userId) row.user_id = userId
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
  const { user } = useAuth()
  const [courses, setCourses] = useState(load)
  const userRef = useRef(user)

  useEffect(() => { userRef.current = user }, [user])

  // Clear all data when user logs out
  useEffect(() => {
    if (!user) {
      setCourses([])
      try { localStorage.removeItem(LS_KEY) } catch (_) {}
    }
  }, [user])

  // Load from Supabase on auth
  useEffect(() => {
    if (!user || user.demo || !isSupabaseConfigured()) return

    supabase
      .from('courses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then(async ({ data: coursesData, error }) => {
        if (error || !coursesData) return

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
      const { error } = await supabase.from('courses').insert(toDB(course, u.id))
      if (error) console.error('Supabase course insert error:', error)
    }

    return course
  }, [persist])

  const updateCourse = useCallback(async (id, changes) => {
    persist(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c))

    const u = userRef.current
    if (u && !u.demo && isSupabaseConfigured()) {
      const dbChanges = {}
      if ('name' in changes) dbChanges.name = changes.name
      if ('code' in changes) dbChanges.code = changes.code
      if ('professor' in changes) dbChanges.professor = changes.professor
      if ('credits' in changes) dbChanges.credits = changes.credits
      if ('color' in changes) dbChanges.color = changes.color
      if ('semester' in changes) dbChanges.semester = changes.semester
      if ('targetGrade' in changes) dbChanges.target_grade = changes.targetGrade
      if ('syllabus' in changes) dbChanges.syllabus = changes.syllabus
      if ('syllabusName' in changes) dbChanges.syllabus_name = changes.syllabusName
      if ('syllabusData' in changes) dbChanges.syllabus_data = changes.syllabusData

      if (Object.keys(dbChanges).length > 0) {
        const { error } = await supabase.from('courses').update(dbChanges).eq('id', id)
        if (error) console.error('Supabase course update error:', error)
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
