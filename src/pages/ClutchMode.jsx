import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useCourses } from '../context/CoursesContext'
import { useSessions } from '../context/SessionsContext'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

// ─── PDF text extraction ───────────────────────────────────────────────────────
async function extractPDFText(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map(item => item.str).join(' ') + '\n'
  }
  return text
}

// ─── Fallback generator ────────────────────────────────────────────────────────
function generateFallback(topic, files) {
  const hasFiles = files.length > 0
  const fileNames = files.map(f => f.name).join(', ')
  return {
    coreConcepts: [
      {
        term: `Core Principles of ${topic}`,
        explanation: hasFiles
          ? `Based on your uploaded materials (${fileNames}), focus on the fundamental definitions, main theories, and key relationships between concepts.`
          : 'Review the fundamental definitions and theories covered in your course notes. Focus on bolded terms and chapter summaries.',
        example: 'Look at your notes for the most frequently repeated ideas — those are highest probability exam content.',
        whyItMatters: 'Core principles appear in 80% of exam questions in some form.',
      },
      {
        term: 'Key Relationships & Causality',
        explanation: 'Understand HOW and WHY things connect — not just what they are. Exams test whether you understand cause and effect, not just definitions.',
        example: 'For each major concept, ask: "What causes this?" and "What does this cause?"',
        whyItMatters: 'Application questions require understanding relationships, not just memorization.',
      },
      {
        term: 'Edge Cases & Exceptions',
        explanation: 'Professors love testing edge cases. Know the "but what if..." scenarios for major rules.',
        example: "If there's a rule, there's usually an exception. Know both.",
        whyItMatters: 'Distinguishes A students from B students.',
      },
      {
        term: 'Real-World Applications',
        explanation: 'Be ready to apply concepts to novel scenarios. Read any case studies or examples in your materials carefully.',
        example: 'Think of one concrete real-world example for each major concept.',
        whyItMatters: 'Higher-order thinking questions test application.',
      },
    ],
    formulas: hasFiles ? [] : [
      { formula: 'Review all formulas from your notes', explanation: "Write each one 3x from memory. If you can't, that's what to study." },
      { formula: 'Know the units for every formula', explanation: 'Easy marks if you know them.' },
    ],
    likelyQuestions: [
      { question: `Explain the key concepts of ${topic} in your own words`, answer: 'Use precise definitions from your notes. Include examples to demonstrate understanding, not just memorized facts.' },
      { question: `What are the main relationships/connections in ${topic}?`, answer: 'Draw connections between concepts. Show cause-and-effect relationships.' },
      { question: 'Apply this knowledge to a novel scenario', answer: 'Break down the scenario, identify which concepts apply, then explain how they apply step by step.' },
      { question: 'What are the limitations or criticisms of the main theories?', answer: 'Know at least 2 critiques for major concepts. Shows deeper understanding.' },
    ],
    commonMisconceptions: [
      'Confusing correlation with causation in explanations',
      'Mixing up similar terms that sound alike but mean different things',
      'Forgetting the scope/conditions under which a rule applies',
      'Not reading the full question before answering',
    ],
    studyPlan: [
      { title: 'Quick Review', minutes: 15, description: hasFiles ? `Read through all uploaded materials (${fileNames}). Don't memorize yet — refresh your memory. Star anything unfamiliar.` : `Read through all notes on ${topic}. Star anything you don't recognize.` },
      { title: 'Active Recall', minutes: 20, description: 'Close your notes. Write down everything you remember. Then open and fill gaps. Focus on what you FORGOT.' },
      { title: 'Practice Questions', minutes: 15, description: 'Answer the exam questions above WITHOUT looking at answers first. Then check.' },
      { title: 'Final Cram', minutes: 10, description: "Review only things you got wrong. You're more ready than you think." },
    ],
  }
}

// ─── Color / style constants ───────────────────────────────────────────────────
const BG = '#080a0e'
const CARD = 'rgba(255,255,255,0.04)'
const BORDER = '1px solid rgba(255,255,255,0.08)'
const SCENE_LABEL = { fontSize: 9, color: '#3b82f6', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700 }
const HEADING = { color: '#fff', fontWeight: 900, letterSpacing: '-0.04em' }
const BODY = { color: 'rgba(255,255,255,0.55)' }
const BLUE = '#3b82f6'
const CYAN = '#06b6d4'
const DIVIDER = '1px solid rgba(255,255,255,0.06)'

const cardStyle = {
  background: CARD,
  border: BORDER,
  borderRadius: 16,
  padding: '20px 20px',
}

const LOADING_STEPS = [
  'Reading your materials...',
  'Identifying exam-critical content...',
  'Preparing deep explanations...',
  'Building your teaching guide...',
]

const STUDY_PLAN_DURATION = 60

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ClutchMode() {
  const location = useLocation()
  const { courses } = useCourses()
  const { sessions, sessionCount, addSession } = useSessions()
  const preload = location.state || {}

  // ── Core flow state
  const [step, setStep] = useState('input') // 'input' | 'loading' | 'result'
  const [selectedCourseId, setSelectedCourseId] = useState(preload.courseId || '')
  const [topic, setTopic] = useState('')
  const [courseLevel, setCourseLevel] = useState('undergraduate')
  const [examType, setExamType] = useState('mixed')
  const [focusAreas, setFocusAreas] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [result, setResult] = useState(null)
  const [loadingStep, setLoadingStep] = useState(0)

  // ── Binary file manual input
  const [binaryFileName, setBinaryFileName] = useState(null)
  const [binaryPasteText, setBinaryPasteText] = useState('')
  const [showBinaryModal, setShowBinaryModal] = useState(false)

  // ── Quiz state
  const [quizActive, setQuizActive] = useState(false)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState([]) // 'got' | 'almost' | 'missed'
  const [showQuizAnswer, setShowQuizAnswer] = useState(false)
  const [quizFinished, setQuizFinished] = useState(false)

  // ── Flashcard state
  const [flashcardActive, setFlashcardActive] = useState(false)
  const [flashcardIndex, setFlashcardIndex] = useState(0)
  const [flashcardFlipped, setFlashcardFlipped] = useState(false)
  const [flashcardOrder, setFlashcardOrder] = useState([])

  // ── Session history state
  const [sessionsOpen, setSessionsOpen] = useState(false)
  const [sessionSaved, setSessionSaved] = useState(false)

  // ── Expanded concept accordion
  const [activeConceptIdx, setActiveConceptIdx] = useState(null)

  // ── Timer
  const [timerRunning, setTimerRunning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(STUDY_PLAN_DURATION * 60)
  const [currentPhase, setCurrentPhase] = useState(0)

  const timerRef = useRef(null)
  const loadingRef = useRef(null)
  const fileInputRef = useRef()

  const selectedCourse = courses.find(c => c.id === selectedCourseId)
  const courseName = selectedCourse?.name || preload.courseName || ''
  const courseId = selectedCourse?.id || preload.courseId || ''

  // ── Pre-load course materials from navigation state
  useEffect(() => {
    if (preload.materials?.length > 0 && uploadedFiles.length === 0) {
      setUploadedFiles(preload.materials.map(m => ({
        id: m.id || crypto.randomUUID(),
        name: m.name,
        content: m.content || '',
        type: m.type || 'text/plain',
        fromCourse: true,
      })))
    }
  }, [])

  // ── Sync course materials when course selector changes
  useEffect(() => {
    if (selectedCourse?.materials?.length > 0) {
      const courseFiles = selectedCourse.materials.map(m => ({
        id: m.id,
        name: m.name,
        content: m.content || '',
        type: m.type || 'text/plain',
        fromCourse: true,
      }))
      setUploadedFiles(prev => {
        const nonCourse = prev.filter(f => !f.fromCourse)
        return [...courseFiles, ...nonCourse]
      })
    } else {
      setUploadedFiles(prev => prev.filter(f => !f.fromCourse))
    }
  }, [selectedCourseId])

  // ── Timer logic
  useEffect(() => {
    if (timerRunning && secondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) { clearInterval(timerRef.current); setTimerRunning(false); return 0 }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timerRef.current)
    }
  }, [timerRunning])

  useEffect(() => {
    if (!result) return
    const elapsed = (STUDY_PLAN_DURATION * 60) - secondsLeft
    const phases = result.studyPlan || []
    let cumulative = 0
    for (let i = 0; i < phases.length; i++) {
      cumulative += (phases[i].minutes || 15) * 60
      if (elapsed < cumulative) { setCurrentPhase(i); return }
    }
    setCurrentPhase(phases.length - 1)
  }, [secondsLeft, result])

  // ── Loading step cycle
  useEffect(() => {
    if (step !== 'loading') return
    let i = 0
    loadingRef.current = setInterval(() => {
      i = (i + 1) % LOADING_STEPS.length
      setLoadingStep(i)
    }, 900)
    return () => clearInterval(loadingRef.current)
  }, [step])


  // ── Flashcard order init
  useEffect(() => {
    if (result?.coreConcepts?.length > 0) {
      setFlashcardOrder(result.coreConcepts.map((_, i) => i))
    }
  }, [result])

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const timerPercent = ((STUDY_PLAN_DURATION * 60 - secondsLeft) / (STUDY_PLAN_DURATION * 60)) * 100
  const circumference = 2 * Math.PI * 54

  // ── File reading
  const handleFileRead = useCallback((file) => {
    return new Promise((resolve) => {
      const name = file.name.toLowerCase()
      const isBinary = name.endsWith('.pptx') || name.endsWith('.ppt') || name.endsWith('.docx') || name.endsWith('.doc')
      const isPDF = name.endsWith('.pdf') || file.type === 'application/pdf'

      if (isBinary) {
        // Show modal for binary formats
        setBinaryFileName(file.name)
        setShowBinaryModal(true)
        // Resolve with placeholder; user can paste text via modal
        resolve({
          id: crypto.randomUUID(),
          name: file.name,
          content: '',
          type: file.type,
          fromCourse: false,
          needsPaste: true,
        })
        return
      }

      if (isPDF) {
        extractPDFText(file)
          .then(text => resolve({
            id: crypto.randomUUID(),
            name: file.name,
            content: text,
            type: file.type,
            fromCourse: false,
          }))
          .catch(() => resolve({
            id: crypto.randomUUID(),
            name: file.name,
            content: '',
            type: file.type,
            fromCourse: false,
          }))
        return
      }

      // .txt, .md and others
      const reader = new FileReader()
      reader.onload = (e) => resolve({
        id: crypto.randomUUID(),
        name: file.name,
        content: e.target.result,
        type: file.type,
        fromCourse: false,
      })
      reader.onerror = () => resolve({ id: crypto.randomUUID(), name: file.name, content: '', type: file.type, fromCourse: false })
      reader.readAsText(file)
    })
  }, [])

  const handleFiles = useCallback(async (files) => {
    const parsed = await Promise.all(Array.from(files).map(handleFileRead))
    setUploadedFiles(prev => [...prev, ...parsed.filter(f => !prev.some(p => p.name === f.name))])
  }, [handleFileRead])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)
  const removeFile = (id) => setUploadedFiles(prev => prev.filter(f => f.id !== id))

  const saveBinaryPaste = () => {
    setUploadedFiles(prev => prev.map(f =>
      f.name === binaryFileName ? { ...f, content: binaryPasteText, needsPaste: false } : f
    ))
    setBinaryPasteText('')
    setBinaryFileName(null)
    setShowBinaryModal(false)
  }

  // ── Main generate
  const generate = async () => {
    if (!topic.trim() && uploadedFiles.length === 0) return
    setStep('loading')
    setLoadingStep(0)

    const files = uploadedFiles.map(f => ({ name: f.name, type: f.type, content: (f.content || '').slice(0, 8000) }))
    const courseCtx = selectedCourse
      ? { name: selectedCourse.name, code: selectedCourse.code, professor: selectedCourse.professor }
      : preload.courseName
        ? { name: preload.courseName, code: preload.courseCode }
        : null

    const effectiveTopic = topic || selectedCourse?.name || preload.courseName || 'General Study'
    const fileContext = files.map(f => `--- FILE: ${f.name} ---\n${f.content}`).join('\n\n')

    let data = null
    const apiKey = import.meta.env.VITE_GROQ_API_KEY
    if (apiKey) {
      try {
        setLoadingStep(1)
        const prompt = `You are an expert university tutor. Create a comprehensive exam study guide for: "${effectiveTopic}"
${courseCtx ? `Course: ${courseCtx.name} (${courseCtx.code || ''})` : ''}
Exam type: ${examType || 'mixed'}
Level: ${courseLevel || 'undergraduate'}
${focusAreas ? `Focus on: ${focusAreas}` : ''}
${fileContext ? `\nMATERIALS PROVIDED:\n${fileContext.slice(0, 10000)}` : ''}

Return ONLY valid JSON with this exact structure:
{
  "coreConcepts": [
    { "term": "string", "explanation": "string", "example": "string", "whyItMatters": "string" }
  ],
  "formulas": [
    { "name": "string", "formula": "string", "whenToUse": "string", "variables": "string" }
  ],
  "likelyQuestions": [
    { "question": "string", "answer": "string", "type": "string" }
  ],
  "misconceptions": [
    { "myth": "string", "reality": "string" }
  ],
  "studyPlan": [
    { "phase": "string", "duration": "string", "action": "string", "goal": "string" }
  ],
  "flashcards": [
    { "front": "string", "back": "string" }
  ],
  "summary": "string"
}

Rules:
- coreConcepts: 5-8 most exam-critical concepts, detailed explanations
- formulas: include ONLY if subject has math/science formulas, otherwise []
- likelyQuestions: 5-7 likely exam questions with full answers
- misconceptions: 3-5 common student mistakes
- studyPlan: 4-5 timed phases for a focused study session
- flashcards: 8-12 term/definition pairs
- Be specific to the actual topic and materials provided`

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.3,
            max_tokens: 4096,
          }),
        })
        setLoadingStep(2)
        if (res.ok) {
          const json = await res.json()
          data = JSON.parse(json.choices[0].message.content)
          setLoadingStep(3)
        }
      } catch (e) {
        console.warn('Groq generate error, using fallback:', e)
      }
    }

    if (!data) {
      await new Promise(r => setTimeout(r, 1800))
      data = generateFallback(effectiveTopic, uploadedFiles)
    }

    setResult(data)
    setStep('result')
    setSessionSaved(false)

    // Save to session history
    addSession({
      courseId,
      courseName,
      topic: topic || selectedCourse?.name || 'Your Course',
      filesUsed: uploadedFiles.map(f => f.name),
      result: data,
    })
    setSessionSaved(true)

    // Reset quiz/flashcard states for new result
    setQuizActive(false)
    setQuizIndex(0)
    setQuizAnswers([])
    setShowQuizAnswer(false)
    setQuizFinished(false)
    setFlashcardActive(false)
    setFlashcardIndex(0)
    setFlashcardFlipped(false)
    setActiveConceptIdx(null)
  }

  const resetAll = () => {
    setStep('input')
    setResult(null)
    setTimerRunning(false)
    clearInterval(timerRef.current)
    setSecondsLeft(STUDY_PLAN_DURATION * 60)
    setTopic('')
    setFocusAreas('')
    setActiveConceptIdx(null)
    setQuizActive(false)
    setQuizFinished(false)
    setQuizAnswers([])
    setFlashcardActive(false)
    setSessionSaved(false)
  }

  const restoreSession = (session) => {
    setResult(session.result)
    setStep('result')
    setSelectedCourseId(session.courseId || '')
    setTopic(session.topic || '')
    setSessionSaved(true)
    setSessionsOpen(false)
    setQuizActive(false)
    setQuizFinished(false)
    setQuizAnswers([])
    setFlashcardActive(false)
    setActiveConceptIdx(null)
  }

  // ── Quiz actions
  const startQuiz = () => {
    setQuizActive(true)
    setQuizIndex(0)
    setQuizAnswers([])
    setShowQuizAnswer(false)
    setQuizFinished(false)
  }

  const answerQuiz = (grade) => {
    const newAnswers = [...quizAnswers, grade]
    setQuizAnswers(newAnswers)
    const questions = result?.likelyQuestions || []
    if (quizIndex + 1 >= questions.length) {
      setQuizFinished(true)
    } else {
      setQuizIndex(quizIndex + 1)
      setShowQuizAnswer(false)
    }
  }

  // ── Flashcard actions
  const openFlashcards = () => {
    setFlashcardActive(true)
    setFlashcardIndex(0)
    setFlashcardFlipped(false)
    setFlashcardOrder((result?.coreConcepts || []).map((_, i) => i))
  }

  const shuffleFlashcards = () => {
    const arr = [...flashcardOrder]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    setFlashcardOrder(arr)
    setFlashcardIndex(0)
    setFlashcardFlipped(false)
  }

  const canGenerate = topic.trim() || uploadedFiles.length > 0 || selectedCourseId

  const fileIcon = (type = '', name = '') => {
    if (type.includes('pdf') || name.endsWith('.pdf')) return '📄'
    if (name.endsWith('.pptx') || name.endsWith('.ppt')) return '📊'
    if (name.endsWith('.docx') || name.endsWith('.doc')) return '📝'
    if (type.includes('video') || name.endsWith('.mp4')) return '🎬'
    return '📋'
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: BG, minHeight: '100vh', color: '#fff', fontFamily: 'inherit', position: 'relative' }}>

      {/* ── Binary paste modal */}
      {showBinaryModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{ ...cardStyle, maxWidth: 520, width: '100%', background: '#111318', border: BORDER }}>
            <p style={{ ...SCENE_LABEL, marginBottom: 8 }}>Binary Format Detected</p>
            <h3 style={{ ...HEADING, fontSize: 18, marginBottom: 6 }}>{binaryFileName}</h3>
            <p style={{ ...BODY, fontSize: 13, marginBottom: 16 }}>
              Binary format — paste your notes as text below
            </p>
            <textarea
              rows={8}
              value={binaryPasteText}
              onChange={e => setBinaryPasteText(e.target.value)}
              placeholder="Paste the content of your file here..."
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)', border: BORDER,
                borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13,
                resize: 'vertical', outline: 'none', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={saveBinaryPaste} style={{
                flex: 1, padding: '10px 0', borderRadius: 10, fontWeight: 800, fontSize: 13,
                background: `linear-gradient(135deg, ${BLUE}, ${CYAN})`, color: '#fff', border: 'none', cursor: 'pointer',
              }}>Save Text</button>
              <button onClick={() => setShowBinaryModal(false)} style={{
                padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 13,
                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', border: BORDER, cursor: 'pointer',
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Flashcard overlay */}
      {flashcardActive && result?.coreConcepts?.length > 0 && (
        <FlashcardOverlay
          concepts={result.coreConcepts}
          order={flashcardOrder}
          index={flashcardIndex}
          flipped={flashcardFlipped}
          onFlip={() => setFlashcardFlipped(f => !f)}
          onPrev={() => { setFlashcardIndex(i => Math.max(0, i - 1)); setFlashcardFlipped(false) }}
          onNext={() => { setFlashcardIndex(i => Math.min(flashcardOrder.length - 1, i + 1)); setFlashcardFlipped(false) }}
          onShuffle={shuffleFlashcards}
          onClose={() => setFlashcardActive(false)}
        />
      )}

      {/* ── Sessions side panel */}
      {sessionsOpen && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 320, zIndex: 50,
          background: '#0d1017', borderLeft: BORDER, overflowY: 'auto', padding: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <p style={{ ...SCENE_LABEL }}>Past Sessions</p>
            <button onClick={() => setSessionsOpen(false)} style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18,
            }}>×</button>
          </div>
          {sessions.length === 0 ? (
            <p style={{ ...BODY, fontSize: 13 }}>No sessions saved yet.</p>
          ) : sessions.map(s => (
            <button key={s.id} onClick={() => restoreSession(s)} style={{
              width: '100%', textAlign: 'left', background: CARD, border: BORDER,
              borderRadius: 12, padding: '14px 14px', marginBottom: 10, cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            onMouseOut={e => e.currentTarget.style.background = CARD}
            >
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, marginBottom: 3 }}>
                {s.topic || 'Untitled'}
              </p>
              {s.courseName && (
                <p style={{ ...BODY, fontSize: 11, marginBottom: 3 }}>{s.courseName}</p>
              )}
              <p style={{ color: BLUE, fontSize: 11 }}>
                {new Date(s.savedAt).toLocaleDateString()} · {s.filesUsed?.length || 0} file{(s.filesUsed?.length || 0) !== 1 ? 's' : ''}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* ── Main content ── */}
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '32px 20px 120px' }}>

        {/* ════════════════════════════════════════════════════════
            SCENE 00 — BRIEFING (input step)
        ════════════════════════════════════════════════════════ */}
        {step === 'input' && (
          <div>
            <p style={{ ...SCENE_LABEL, marginBottom: 6 }}>Scene 00 — Briefing</p>
            <h1 style={{ ...HEADING, fontSize: 30, marginBottom: 6 }}>Clutch Mode</h1>
            <p style={{ ...BODY, fontSize: 14, marginBottom: 28 }}>
              Upload your materials. The AI teaches you what's on the exam.
            </p>

            {/* Course selector */}
            {courses.length > 0 && (
              <div style={{ ...cardStyle, marginBottom: 16 }}>
                <p style={{ ...SCENE_LABEL, marginBottom: 12 }}>Course (optional)</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button
                    onClick={() => setSelectedCourseId('')}
                    style={{
                      padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      background: !selectedCourseId ? 'rgba(255,255,255,0.1)' : 'transparent',
                      color: !selectedCourseId ? '#fff' : 'rgba(255,255,255,0.45)',
                      border: `1px solid ${!selectedCourseId ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
                      transition: 'all 0.15s',
                    }}>
                    General
                  </button>
                  {courses.map(c => (
                    <button key={c.id} onClick={() => setSelectedCourseId(c.id)} style={{
                      padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      background: selectedCourseId === c.id ? `${c.color}18` : 'transparent',
                      color: selectedCourseId === c.id ? c.color : 'rgba(255,255,255,0.45)',
                      border: `1px solid ${selectedCourseId === c.id ? c.color + '40' : 'rgba(255,255,255,0.08)'}`,
                      transition: 'all 0.15s',
                    }}>
                      {c.code}
                    </button>
                  ))}
                </div>
                {selectedCourse?.materials?.length > 0 && (
                  <p style={{ fontSize: 12, color: '#22c55e', marginTop: 10 }}>
                    ✓ {selectedCourse.materials.length} file{selectedCourse.materials.length !== 1 ? 's' : ''} from {selectedCourse.code} included
                  </p>
                )}
              </div>
            )}

            {/* Topic */}
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <p style={{ ...SCENE_LABEL, marginBottom: 10 }}>
                What is this guide about?
              </p>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && canGenerate && generate()}
                placeholder="e.g., Cell Division, Thermodynamics, Supply & Demand..."
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)', border: BORDER,
                  borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* File upload zone */}
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <p style={{ ...SCENE_LABEL, marginBottom: 12 }}>
                Upload Materials
                <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, letterSpacing: 0, textTransform: 'none', fontSize: 11, marginLeft: 8 }}>
                  lecture notes, slides, PDFs
                </span>
              </p>

              <input
                ref={fileInputRef} type="file" multiple
                accept=".txt,.md,.pdf,.pptx,.docx,.csv,.rtf"
                style={{ display: 'none' }}
                onChange={e => handleFiles(e.target.files)}
              />

              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `1.5px dashed ${isDragging ? BLUE : 'rgba(255,255,255,0.15)'}`,
                  borderRadius: 12, padding: '32px 20px', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 10, cursor: 'pointer',
                  background: isDragging ? 'rgba(59,130,246,0.06)' : 'transparent',
                  transition: 'all 0.2s',
                }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isDragging ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)', border: BORDER,
                }}>
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={isDragging ? BLUE : 'rgba(255,255,255,0.4)'} strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: isDragging ? BLUE : 'rgba(255,255,255,0.7)', fontWeight: 800, fontSize: 14 }}>
                    {isDragging ? 'Drop files here' : 'Drag & drop or click to upload'}
                  </p>
                  <p style={{ ...BODY, fontSize: 12, marginTop: 2 }}>.txt .md .pdf .pptx .docx</p>
                </div>
              </div>

              {/* Uploaded files — film strip style */}
              {uploadedFiles.length > 0 && (
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {uploadedFiles.map(f => (
                    <div key={f.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10,
                      background: f.fromCourse ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${f.fromCourse ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)'}`,
                    }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{fileIcon(f.type, f.name)}</span>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.name}
                      </span>
                      {f.needsPaste && (
                        <button onClick={() => { setBinaryFileName(f.name); setShowBinaryModal(true) }} style={{
                          fontSize: 10, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)',
                          border: '1px solid rgba(245,158,11,0.25)', borderRadius: 6, padding: '2px 7px', cursor: 'pointer',
                        }}>Paste text</button>
                      )}
                      {f.fromCourse && selectedCourse && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.1)', borderRadius: 6, padding: '2px 7px' }}>
                          {selectedCourse.code}
                        </span>
                      )}
                      {!f.fromCourse && (
                        <button onClick={() => removeFile(f.id)} style={{
                          width: 24, height: 24, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', flexShrink: 0,
                        }}>
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Level + Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={cardStyle}>
                <p style={{ ...SCENE_LABEL, marginBottom: 12 }}>Level</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {[['highschool', 'High School'], ['undergraduate', 'Undergrad'], ['graduate', 'Graduate']].map(([val, label]) => (
                    <button key={val} onClick={() => setCourseLevel(val)} style={{
                      padding: '9px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, textAlign: 'left', cursor: 'pointer',
                      background: courseLevel === val ? `linear-gradient(135deg, ${BLUE}, ${CYAN})` : 'rgba(255,255,255,0.05)',
                      color: courseLevel === val ? '#fff' : 'rgba(255,255,255,0.5)',
                      border: courseLevel === val ? 'none' : BORDER,
                      boxShadow: courseLevel === val ? `0 0 12px rgba(59,130,246,0.3)` : 'none',
                      transition: 'all 0.15s',
                    }}>{label}</button>
                  ))}
                </div>
              </div>
              <div style={cardStyle}>
                <p style={{ ...SCENE_LABEL, marginBottom: 12 }}>Exam Type</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {[['multiple-choice', 'Multiple Choice'], ['short-answer', 'Short Answer'], ['essay', 'Essay'], ['mixed', 'Mixed']].map(([val, label]) => (
                    <button key={val} onClick={() => setExamType(val)} style={{
                      padding: '9px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, textAlign: 'left', cursor: 'pointer',
                      background: examType === val ? `linear-gradient(135deg, ${BLUE}, ${CYAN})` : 'rgba(255,255,255,0.05)',
                      color: examType === val ? '#fff' : 'rgba(255,255,255,0.5)',
                      border: examType === val ? 'none' : BORDER,
                      boxShadow: examType === val ? `0 0 12px rgba(59,130,246,0.3)` : 'none',
                      transition: 'all 0.15s',
                    }}>{label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Focus areas */}
            <div style={{ ...cardStyle, marginBottom: 24 }}>
              <p style={{ ...SCENE_LABEL, marginBottom: 10 }}>
                What confuses you?
                <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, letterSpacing: 0, textTransform: 'none', fontSize: 11, marginLeft: 8 }}>optional</span>
              </p>
              <textarea
                value={focusAreas}
                onChange={e => setFocusAreas(e.target.value)}
                rows={2}
                placeholder="e.g., I don't understand how entropy works..."
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)', border: BORDER,
                  borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13,
                  resize: 'none', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* CTA */}
            <button
              onClick={generate}
              disabled={!canGenerate}
              style={{
                width: '100%', padding: '16px 0', borderRadius: 14, fontSize: 15, fontWeight: 900,
                background: canGenerate ? `linear-gradient(135deg, ${BLUE}, ${CYAN})` : 'rgba(255,255,255,0.06)',
                color: canGenerate ? '#fff' : 'rgba(255,255,255,0.25)',
                border: 'none', cursor: canGenerate ? 'pointer' : 'not-allowed',
                boxShadow: canGenerate ? `0 0 30px rgba(59,130,246,0.35)` : 'none',
                letterSpacing: '0.02em', transition: 'all 0.2s',
              }}>
              {uploadedFiles.length > 0
                ? `BEGIN SESSION — ${uploadedFiles.length} FILE${uploadedFiles.length !== 1 ? 'S' : ''} →`
                : 'BEGIN SESSION →'}
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            LOADING STATE
        ════════════════════════════════════════════════════════ */}
        {step === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', gap: 20 }}>
            {/* Spinner */}
            <div style={{ position: 'relative', width: 80, height: 80 }}>
              <LoadingRing size={80} color={BLUE} duration={2} />
              <LoadingRing size={56} color={CYAN} duration={3} reverse offset={12} />
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={BLUE} strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <p style={{ ...SCENE_LABEL, marginBottom: 12 }}>Analyzing Materials</p>
              <p style={{ ...HEADING, fontSize: 20, marginBottom: 8 }}>
                {LOADING_STEPS[loadingStep]}
              </p>
              <p style={{ ...BODY, fontSize: 13 }}>
                {uploadedFiles.length > 0
                  ? `${uploadedFiles.length} file${uploadedFiles.length !== 1 ? 's' : ''} · ${courseName || topic}`
                  : `Topic: ${topic}`}
              </p>
            </div>

            {/* Pulsing dots */}
            <div style={{ display: 'flex', gap: 8 }}>
              {LOADING_STEPS.map((_, i) => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: i <= loadingStep ? BLUE : 'rgba(255,255,255,0.1)',
                  transition: 'background 0.3s',
                }} />
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            RESULTS — Scenes revealed
        ════════════════════════════════════════════════════════ */}
        {step === 'result' && result && (
          <div>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
              <p style={{ ...SCENE_LABEL, marginBottom: 6 }}>Session Complete</p>
              <h1 style={{ ...HEADING, fontSize: 26, marginBottom: 4 }}>
                {topic || courseName || 'Your Study Guide'}
              </h1>
              <p style={{ ...BODY, fontSize: 13 }}>
                {courseName && <span style={{ color: CYAN }}>{courseName} · </span>}
                {uploadedFiles.length > 0 && `${uploadedFiles.length} file${uploadedFiles.length !== 1 ? 's' : ''} analyzed · `}
                Guide ready
              </p>
            </div>

            {/* SCENE 01 — CORE CONCEPTS */}
            {(result.coreConcepts?.length > 0 || result.keyConcepts?.length > 0) && (
              <SceneSection label="Scene 01" title="Core Concepts" subtitle="Master these first">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(result.coreConcepts || result.keyConcepts || []).map((concept, i) => (
                    <div key={i}>
                      <button
                        onClick={() => setActiveConceptIdx(activeConceptIdx === i ? null : i)}
                        style={{
                          width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.04)',
                          border: `1px solid ${activeConceptIdx === i ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
                          borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                          transition: 'border 0.15s',
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ color: '#fff', fontWeight: 900, fontSize: 15, letterSpacing: '-0.02em' }}>
                            {concept.term || concept.title}
                          </span>
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.3)" strokeWidth={2}
                            style={{ transform: activeConceptIdx === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>

                        {activeConceptIdx === i && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <p style={{ ...BODY, fontSize: 13, lineHeight: 1.65, marginBottom: concept.example ? 10 : 0 }}>
                              {concept.explanation || concept.definition}
                            </p>
                            {concept.example && (
                              <div style={{
                                background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.12)',
                                borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'rgba(255,255,255,0.6)',
                                fontStyle: 'italic', marginBottom: concept.whyItMatters ? 8 : 0,
                              }}>
                                Example: {concept.example}
                              </div>
                            )}
                            {concept.whyItMatters && (
                              <p style={{ fontSize: 12, color: CYAN, marginTop: 4 }}>
                                Why it matters: {concept.whyItMatters}
                              </p>
                            )}
                          </div>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </SceneSection>
            )}

            {/* SCENE 02 — WORKED EXAMPLES */}
            {result.workedExamples?.length > 0 && (
              <SceneSection label="Scene 02" title="Worked Examples" subtitle="Step-by-step walkthroughs">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {result.workedExamples.map((ex, i) => (
                    <div key={i} style={{
                      padding: '14px 16px', borderRadius: 12,
                      background: 'rgba(6,182,212,0.05)', borderLeft: `3px solid ${CYAN}`,
                      border: `1px solid rgba(6,182,212,0.15)`,
                    }}>
                      <p style={{ color: '#fff', fontWeight: 800, fontSize: 14, marginBottom: 8 }}>
                        {i + 1}. {ex.problem || ex.title}
                      </p>
                      <p style={{ ...BODY, fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-line', fontFamily: 'ui-monospace, monospace' }}>
                        {ex.solution || ex.steps}
                      </p>
                    </div>
                  ))}
                </div>
              </SceneSection>
            )}

            {/* Formulas */}
            {result.formulas?.length > 0 && (
              <SceneSection label="Scene 02b" title="Formulas & Key Facts" subtitle="Memorize these">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {result.formulas.map((f, i) => (
                    <div key={i} style={{
                      padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: BORDER,
                    }}>
                      <p style={{ color: CYAN, fontFamily: 'ui-monospace, monospace', fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
                        {f.formula}
                      </p>
                      <p style={{ ...BODY, fontSize: 12 }}>{f.explanation}</p>
                    </div>
                  ))}
                </div>
              </SceneSection>
            )}

            {/* SCENE 03 — EXAM QUESTIONS */}
            {result.likelyQuestions?.length > 0 && (
              <SceneSection label="Scene 03" title="Likely Exam Questions" subtitle="Practice these before you sleep">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {result.likelyQuestions.map((q, i) => (
                    <details key={i} style={{ borderRadius: 12, overflow: 'hidden' }}>
                      <summary style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer',
                        background: 'rgba(255,255,255,0.04)', border: BORDER, borderRadius: 12, listStyle: 'none',
                        userSelect: 'none',
                      }}>
                        <span style={{
                          fontSize: 11, fontWeight: 900, padding: '2px 8px', borderRadius: 6,
                          background: 'rgba(245,158,11,0.15)', color: '#f59e0b', flexShrink: 0,
                        }}>Q{i + 1}</span>
                        <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, flex: 1 }}>{q.question}</span>
                      </summary>
                      <div style={{
                        padding: '12px 16px 14px', background: 'rgba(255,255,255,0.03)',
                        borderTop: DIVIDER, fontSize: 13, lineHeight: 1.65, ...BODY,
                      }}>
                        {q.answer}
                      </div>
                    </details>
                  ))}
                </div>
              </SceneSection>
            )}

            {/* SCENE 04 — QUIZ YOURSELF */}
            {result.likelyQuestions?.length > 0 && (
              <SceneSection label="Scene 04" title="Quiz Yourself" subtitle="Test your knowledge">
                {!quizActive && !quizFinished && (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <p style={{ ...BODY, fontSize: 13, marginBottom: 20 }}>
                      {result.likelyQuestions.length} questions · Self-graded · Instant feedback
                    </p>
                    <button onClick={startQuiz} style={{
                      padding: '11px 28px', borderRadius: 10, fontSize: 14, fontWeight: 800,
                      background: `linear-gradient(135deg, ${BLUE}, ${CYAN})`, color: '#fff',
                      border: 'none', cursor: 'pointer', boxShadow: `0 0 20px rgba(59,130,246,0.3)`,
                    }}>Start Quiz →</button>
                  </div>
                )}

                {quizActive && !quizFinished && (
                  <QuizCard
                    question={result.likelyQuestions[quizIndex]}
                    index={quizIndex}
                    total={result.likelyQuestions.length}
                    showAnswer={showQuizAnswer}
                    onReveal={() => setShowQuizAnswer(true)}
                    onGrade={answerQuiz}
                  />
                )}

                {quizFinished && (
                  <QuizResults
                    answers={quizAnswers}
                    questions={result.likelyQuestions}
                    onRetry={startQuiz}
                  />
                )}
              </SceneSection>
            )}

            {/* SCENE 05 — FLASHCARDS */}
            {result.coreConcepts?.length > 0 && (
              <SceneSection label="Scene 05" title="Flashcards" subtitle="Flip through core concepts">
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <p style={{ ...BODY, fontSize: 13, marginBottom: 20 }}>
                    {result.coreConcepts.length} cards · Term on front · Explanation on back
                  </p>
                  <button onClick={openFlashcards} style={{
                    padding: '11px 28px', borderRadius: 10, fontSize: 14, fontWeight: 800,
                    background: `linear-gradient(135deg, #7c3aed, #3b82f6)`, color: '#fff',
                    border: 'none', cursor: 'pointer', boxShadow: `0 0 20px rgba(124,58,237,0.3)`,
                  }}>Open Flashcards →</button>
                </div>
              </SceneSection>
            )}

            {/* Common Misconceptions */}
            {(result.commonMisconceptions?.length > 0 || result.commonMistakes?.length > 0) && (
              <SceneSection
                label="Scene 05b"
                title="Common Misconceptions"
                subtitle="Students get these wrong"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(result.commonMisconceptions || result.commonMistakes || []).map((m, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px',
                      borderRadius: 10, background: 'rgba(239,68,68,0.05)', borderLeft: '3px solid rgba(239,68,68,0.5)',
                      border: '1px solid rgba(239,68,68,0.12)',
                    }}>
                      <span style={{ color: '#ef4444', fontWeight: 900, fontSize: 12, flexShrink: 0, marginTop: 1 }}>✕</span>
                      <span style={{ ...BODY, fontSize: 13, lineHeight: 1.55 }}>{m}</span>
                    </div>
                  ))}
                </div>
              </SceneSection>
            )}

            {/* SCENE 06 — STUDY PLAN */}
            {result.studyPlan?.length > 0 && (
              <SceneSection label="Scene 06" title="Study Plan" subtitle="60-minute countdown — follow in order">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {result.studyPlan.map((phase, i) => {
                    const isActive = timerRunning && i === currentPhase
                    return (
                      <div key={i} style={{
                        padding: '14px 16px', borderRadius: 12,
                        background: isActive ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isActive ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.06)'}`,
                        borderLeft: `3px solid ${isActive ? BLUE : 'rgba(255,255,255,0.08)'}`,
                        transition: 'all 0.3s',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ color: isActive ? BLUE : '#fff', fontWeight: 800, fontSize: 14 }}>
                            {isActive && <span style={{ marginRight: 6 }}>▶</span>}{phase.title}
                          </span>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                            background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)',
                          }}>{phase.minutes} min</span>
                        </div>
                        <p style={{ ...BODY, fontSize: 12, lineHeight: 1.55 }}>{phase.description}</p>
                      </div>
                    )
                  })}
                </div>

                {/* Timer */}
                <div style={{ marginTop: 20, padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: BORDER, textAlign: 'center' }}>
                  <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 16px' }}>
                    <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
                      <circle cx="60" cy="60" r="54" fill="none"
                        stroke={secondsLeft <= 300 ? '#ef4444' : BLUE}
                        strokeWidth="7" strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - (timerPercent / 100) * circumference}
                        style={{ transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 6px ${secondsLeft <= 300 ? 'rgba(239,68,68,0.5)' : 'rgba(59,130,246,0.5)'})` }}
                      />
                    </svg>
                    <div style={{
                      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{
                        fontSize: 22, fontWeight: 900, fontFamily: 'ui-monospace, monospace',
                        color: secondsLeft <= 300 ? '#ef4444' : CYAN,
                      }}>{formatTime(secondsLeft)}</span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginTop: 2 }}>
                        {secondsLeft === 0 ? 'DONE' : `PHASE ${currentPhase + 1}`}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button
                      onClick={() => {
                        if (!timerRunning && secondsLeft === STUDY_PLAN_DURATION * 60) {
                          setSecondsLeft(STUDY_PLAN_DURATION * 60)
                          setCurrentPhase(0)
                        }
                        setTimerRunning(t => !t)
                      }}
                      style={{
                        padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                        background: `linear-gradient(135deg, ${BLUE}, ${CYAN})`, color: '#fff',
                        border: 'none', cursor: 'pointer',
                      }}>
                      {timerRunning ? '⏸ Pause' : secondsLeft === STUDY_PLAN_DURATION * 60 ? '▶ Start Timer' : '▶ Resume'}
                    </button>
                    {(timerRunning || secondsLeft < STUDY_PLAN_DURATION * 60) && (
                      <button
                        onClick={() => { setTimerRunning(false); setSecondsLeft(STUDY_PLAN_DURATION * 60); setCurrentPhase(0) }}
                        style={{
                          padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                          background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                          border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer',
                        }}>Reset</button>
                    )}
                  </div>
                </div>
              </SceneSection>
            )}

            {/* Bottom bar */}
            <div style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              background: 'rgba(8,10,14,0.95)', backdropFilter: 'blur(12px)',
              borderTop: BORDER, padding: '12px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              zIndex: 40,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: sessionSaved ? '#22c55e' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                  {sessionSaved ? '✓ Session Saved' : '○ Not saved'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setSessionsOpen(s => !s)}
                  style={{
                    padding: '8px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700,
                    background: sessionsOpen ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.06)',
                    color: sessionsOpen ? BLUE : 'rgba(255,255,255,0.55)',
                    border: `1px solid ${sessionsOpen ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    cursor: 'pointer',
                  }}>
                  Past Sessions {sessions.length > 0 && `(${sessions.length})`}
                </button>
                <button
                  onClick={resetAll}
                  style={{
                    padding: '8px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700,
                    background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)',
                    border: BORDER, cursor: 'pointer',
                  }}>
                  New Session ↺
                </button>
              </div>
            </div>

            {/* Bottom padding for fixed bar */}
            <div style={{ height: 72 }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Scene section wrapper ─────────────────────────────────────────────────────
function SceneSection({ label, title, subtitle, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ ...SCENE_LABEL, marginBottom: 6 }}>{label} — {title}</p>
      {subtitle && <p style={{ ...BODY, fontSize: 12, marginBottom: 14 }}>{subtitle}</p>}
      <div style={{
        background: CARD, border: BORDER, borderRadius: 16, padding: '20px',
      }}>
        {children}
      </div>
    </div>
  )
}

// ─── Loading ring (CSS animation via inline keyframes trick using style tag) ────
function LoadingRing({ size, color, duration, reverse = false, offset = 0 }) {
  const style = {
    position: 'absolute',
    top: offset, left: offset, right: offset, bottom: offset,
    width: size - offset * 2, height: size - offset * 2,
    borderRadius: '50%',
    border: `3px solid transparent`,
    borderTopColor: color,
    borderRightColor: `${color}33`,
    animation: `${reverse ? 'spin-reverse' : 'spin'} ${duration}s linear infinite`,
  }

  return (
    <>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-reverse { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
      `}</style>
      <div style={style} />
    </>
  )
}

// ─── Quiz Card ─────────────────────────────────────────────────────────────────
function QuizCard({ question, index, total, showAnswer, onReveal, onGrade }) {
  const pct = Math.round(((index) / total) * 100)
  return (
    <div>
      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: BLUE, fontWeight: 700 }}>Question {index + 1} of {total}</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{pct}% complete</span>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${BLUE}, ${CYAN})`, borderRadius: 2, transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* Question */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: BORDER, borderRadius: 12, padding: '18px 16px', marginBottom: 14 }}>
        <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.55 }}>{question.question}</p>
      </div>

      {/* Answer */}
      {!showAnswer ? (
        <button onClick={onReveal} style={{
          width: '100%', padding: '11px 0', borderRadius: 10, fontSize: 13, fontWeight: 800,
          background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)',
          border: BORDER, cursor: 'pointer', letterSpacing: '0.03em',
        }}>Reveal Answer</button>
      ) : (
        <div>
          <div style={{
            background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)',
            borderRadius: 12, padding: '14px 16px', marginBottom: 14,
          }}>
            <p style={{ ...BODY, fontSize: 13, lineHeight: 1.65 }}>{question.answer}</p>
          </div>
          <p style={{ ...BODY, fontSize: 12, marginBottom: 10, textAlign: 'center' }}>How did you do?</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <button onClick={() => onGrade('got')} style={{
              padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 800,
              background: 'rgba(34,197,94,0.1)', color: '#22c55e',
              border: '1px solid rgba(34,197,94,0.25)', cursor: 'pointer',
            }}>Got It ✓</button>
            <button onClick={() => onGrade('almost')} style={{
              padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 800,
              background: 'rgba(245,158,11,0.1)', color: '#f59e0b',
              border: '1px solid rgba(245,158,11,0.25)', cursor: 'pointer',
            }}>Almost</button>
            <button onClick={() => onGrade('missed')} style={{
              padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 800,
              background: 'rgba(239,68,68,0.1)', color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer',
            }}>Missed It ✗</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Quiz Results ──────────────────────────────────────────────────────────────
function QuizResults({ answers, questions, onRetry }) {
  const got = answers.filter(a => a === 'got').length
  const almost = answers.filter(a => a === 'almost').length
  const missed = answers.filter(a => a === 'missed').length
  const total = answers.length
  const pct = Math.round((got / total) * 100)

  const missedQuestions = questions.filter((_, i) => answers[i] === 'missed')

  return (
    <div>
      {/* Score */}
      <div style={{ textAlign: 'center', padding: '20px 0 16px' }}>
        <div style={{
          fontSize: 48, fontWeight: 900, letterSpacing: '-0.04em',
          color: pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444',
          marginBottom: 4,
        }}>{pct}%</div>
        <p style={{ ...BODY, fontSize: 13, marginBottom: 16 }}>
          {pct >= 80 ? "You're ready. Go crush it." : pct >= 50 ? "Almost there — review the ones you missed." : "More practice needed. You've got time."}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#22c55e' }}>{got}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Got It</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#f59e0b' }}>{almost}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Almost</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#ef4444' }}>{missed}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Missed</div>
          </div>
        </div>
        <button onClick={onRetry} style={{
          padding: '10px 24px', borderRadius: 10, fontSize: 13, fontWeight: 800,
          background: `linear-gradient(135deg, ${BLUE}, ${CYAN})`, color: '#fff',
          border: 'none', cursor: 'pointer',
        }}>Try Again</button>
      </div>

      {/* Study these again */}
      {missedQuestions.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>
            Study These Concepts Again
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {missedQuestions.map((q, i) => (
              <div key={i} style={{
                padding: '12px 14px', borderRadius: 10,
                background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)',
                borderLeft: '3px solid rgba(239,68,68,0.4)',
              }}>
                <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, lineHeight: 1.5, marginBottom: 4 }}>{q.question}</p>
                <p style={{ ...BODY, fontSize: 12, lineHeight: 1.55 }}>{q.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Flashcard Overlay ─────────────────────────────────────────────────────────
function FlashcardOverlay({ concepts, order, index, flipped, onFlip, onPrev, onNext, onShuffle, onClose }) {
  const card = concepts[order[index]]
  if (!card) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: BG, zIndex: 90,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: BORDER,
      }}>
        <p style={{ ...SCENE_LABEL }}>Scene 05 — Flashcards</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ ...BODY, fontSize: 12 }}>{index + 1} / {order.length}</span>
          <button onClick={onShuffle} style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)',
            border: BORDER, cursor: 'pointer',
          }}>Shuffle</button>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)',
            border: BORDER, cursor: 'pointer', fontSize: 18,
          }}>×</button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ position: 'absolute', top: 56, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{
          height: '100%', background: `linear-gradient(90deg, ${BLUE}, ${CYAN})`,
          width: `${((index + 1) / order.length) * 100}%`, transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Card with 3D flip */}
      <div
        onClick={onFlip}
        style={{
          width: '100%', maxWidth: 520, height: 280, cursor: 'pointer',
          perspective: 1000,
          marginTop: 20,
        }}>
        <div style={{
          width: '100%', height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 0.5s ease',
        }}>
          {/* Front */}
          <div style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden',
            background: 'rgba(255,255,255,0.05)', border: BORDER, borderRadius: 20,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 32, textAlign: 'center',
          }}>
            <p style={{ fontSize: 9, color: BLUE, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>
              Term
            </p>
            <p style={{ color: '#fff', fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
              {card.term || card.title}
            </p>
            <p style={{ ...BODY, fontSize: 12, marginTop: 20 }}>Click to flip</p>
          </div>

          {/* Back */}
          <div style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 20,
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            padding: 28, overflowY: 'auto',
          }}>
            <p style={{ fontSize: 9, color: CYAN, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>
              Explanation
            </p>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 1.65, marginBottom: 12 }}>
              {card.explanation || card.definition}
            </p>
            {card.whyItMatters && (
              <div style={{ borderTop: DIVIDER, paddingTop: 12, marginTop: 4 }}>
                <p style={{ fontSize: 11, color: CYAN, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Why It Matters
                </p>
                <p style={{ ...BODY, fontSize: 13, lineHeight: 1.55 }}>{card.whyItMatters}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
        <button onClick={onPrev} disabled={index === 0} style={{
          width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: index === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
          color: index === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)',
          border: BORDER, cursor: index === 0 ? 'not-allowed' : 'pointer', fontSize: 18,
        }}>←</button>
        <button onClick={onFlip} style={{
          padding: '0 24px', height: 48, borderRadius: 12, fontSize: 13, fontWeight: 700,
          background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)',
          border: BORDER, cursor: 'pointer',
        }}>
          {flipped ? 'Show Term' : 'Show Answer'}
        </button>
        <button onClick={onNext} disabled={index === order.length - 1} style={{
          width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: index === order.length - 1 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
          color: index === order.length - 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)',
          border: BORDER, cursor: index === order.length - 1 ? 'not-allowed' : 'pointer', fontSize: 18,
        }}>→</button>
      </div>

      <p style={{ ...BODY, fontSize: 11, marginTop: 14 }}>
        {flipped ? 'Back' : 'Front'} · {index + 1} of {order.length}
      </p>
    </div>
  )
}
