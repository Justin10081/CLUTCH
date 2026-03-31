import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from './AuthContext'

const GPAContext = createContext(null)

const EMPTY_COURSE = {
  name: '',
  code: '',
  currentGrade: 75,
  finalWeight: 30,
  finalScore: 70,
  credits: 3,
  actualGrade: null,
  targetGrade: 'B+',
}

function loadLocal() {
  try {
    const courses = JSON.parse(localStorage.getItem('clutch-gpa-courses'))
    const cumulativeGPA = parseFloat(localStorage.getItem('clutch-cumulative-gpa') || '0')
    const cumulativeCredits = parseInt(localStorage.getItem('clutch-cumulative-credits') || '0')
    return {
      courses: courses?.length ? courses : [{ ...EMPTY_COURSE, name: 'Course 1' }],
      cumulativeGPA,
      cumulativeCredits,
    }
  } catch {
    return {
      courses: [{ ...EMPTY_COURSE, name: 'Course 1' }],
      cumulativeGPA: 0,
      cumulativeCredits: 0,
    }
  }
}

export function GPAProvider({ children }) {
  const { user } = useAuth()
  const local = loadLocal()
  const [courses, setCoursesState] = useState(local.courses)
  const [cumulativeGPA, setCumulativeGPAState] = useState(local.cumulativeGPA)
  const [cumulativeCredits, setCumulativeCreditsState] = useState(local.cumulativeCredits)

  // Refs for reading latest values in debounced sync (avoids stale closures)
  const coursesRef = useRef(courses)
  const cumulativeGPARef = useRef(cumulativeGPA)
  const cumulativeCreditsRef = useRef(cumulativeCredits)
  const syncRef = useRef(null)
  const userRef = useRef(user)

  useEffect(() => { coursesRef.current = courses }, [courses])
  useEffect(() => { cumulativeGPARef.current = cumulativeGPA }, [cumulativeGPA])
  useEffect(() => { cumulativeCreditsRef.current = cumulativeCredits }, [cumulativeCredits])
  useEffect(() => { userRef.current = user }, [user])

  // Clear all data when user logs out
  useEffect(() => {
    if (!user) {
      setCoursesState([{ ...EMPTY_COURSE, name: 'Course 1' }])
      setCumulativeGPAState(0)
      setCumulativeCreditsState(0)
      try {
        localStorage.removeItem('clutch-gpa-courses')
        localStorage.removeItem('clutch-cumulative-gpa')
        localStorage.removeItem('clutch-cumulative-credits')
      } catch (_) {}
    }
  }, [user])

  // Load from Supabase on auth
  useEffect(() => {
    if (!user || user.demo || !isSupabaseConfigured()) return
    supabase
      .from('profiles')
      .select('gpa_data')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (!error && data?.gpa_data) {
          const gd = data.gpa_data
          if (gd.courses?.length) setCoursesState(gd.courses)
          if (gd.cumulativeGPA !== undefined) setCumulativeGPAState(gd.cumulativeGPA)
          if (gd.cumulativeCredits !== undefined) setCumulativeCreditsState(gd.cumulativeCredits)
          // Update localStorage cache
          setTimeout(() => {
            try {
              if (gd.courses) localStorage.setItem('clutch-gpa-courses', JSON.stringify(gd.courses))
              if (gd.cumulativeGPA !== undefined) localStorage.setItem('clutch-cumulative-gpa', gd.cumulativeGPA.toString())
              if (gd.cumulativeCredits !== undefined) localStorage.setItem('clutch-cumulative-credits', gd.cumulativeCredits.toString())
            } catch (_) {}
          }, 0)
        }
      })
  }, [user?.id])

  // Debounced Supabase sync using refs for latest values
  const queueSync = useCallback(() => {
    const u = userRef.current
    if (!u || u.demo || !isSupabaseConfigured()) return
    if (syncRef.current) clearTimeout(syncRef.current)
    syncRef.current = setTimeout(() => {
      supabase
        .from('profiles')
        .update({
          gpa_data: {
            courses: coursesRef.current,
            cumulativeGPA: cumulativeGPARef.current,
            cumulativeCredits: cumulativeCreditsRef.current,
          },
        })
        .eq('id', u.id)
        .then(({ error }) => {
          if (error) console.error('Supabase GPA sync error:', error)
        })
    }, 2000)
  }, [])

  const setCourses = useCallback((updater) => {
    setCoursesState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      setTimeout(() => {
        try { localStorage.setItem('clutch-gpa-courses', JSON.stringify(next)) } catch (_) {}
      }, 0)
      queueSync()
      return next
    })
  }, [queueSync])

  const setCumulativeGPA = useCallback((val) => {
    setCumulativeGPAState(val)
    setTimeout(() => {
      try { localStorage.setItem('clutch-cumulative-gpa', val.toString()) } catch (_) {}
    }, 0)
    queueSync()
  }, [queueSync])

  const setCumulativeCredits = useCallback((val) => {
    setCumulativeCreditsState(val)
    setTimeout(() => {
      try { localStorage.setItem('clutch-cumulative-credits', val.toString()) } catch (_) {}
    }, 0)
    queueSync()
  }, [queueSync])

  return (
    <GPAContext.Provider value={{
      courses,
      setCourses,
      cumulativeGPA,
      setCumulativeGPA,
      cumulativeCredits,
      setCumulativeCredits,
    }}>
      {children}
    </GPAContext.Provider>
  )
}

export function useGPA() {
  const ctx = useContext(GPAContext)
  if (!ctx) throw new Error('useGPA must be used within GPAProvider')
  return ctx
}
