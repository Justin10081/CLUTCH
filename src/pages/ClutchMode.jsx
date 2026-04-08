import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useCourses } from '../context/CoursesContext'
import { useSessions } from '../context/SessionsContext'
import { getAuthToken } from '../lib/supabase'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import ClutchResultView from '../components/ClutchResultView'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

function generateFallback(topic, files) {
  const hasFiles = files.length > 0
  const fileNames = files.map(f => f.name).join(', ')
  return {
    contentType: 'mixed',
    plainEnglish: `Think of ${topic} as a system with several interconnected parts. At its core, it's about understanding how specific concepts relate to each other and why those relationships matter. The key insight is that nothing in ${topic} exists in isolation — every definition, rule, or formula is tied to a deeper underlying mechanism.\n\nHere's what most students miss: knowing what something is called is not the same as understanding it. For ${topic}, you need to be able to explain each concept's cause, its effect, and the conditions under which the rules change. That's what exams actually test.\n\nIf you can explain ${topic} out loud to someone who has never studied it, using your own words and a concrete example, you're ready for the exam. If you can't — that's exactly where to focus. Start with the core definitions, trace the connections, and know at least one real example for every major concept.`,
    teacherNotes: [
      `The most common mistake in ${topic} is confusing surface-level memorization with actual understanding. You must be able to explain WHY, not just WHAT.`,
      `Every major concept in ${topic} has an exception or a boundary condition. Exams specifically test whether you know when the rules break down.`,
      `Connect each concept back to the central theme. Ask yourself: how does this relate to everything else I've learned about ${topic}?`,
    ],
    coreConcepts: [
      { term: `Core Definitions — ${topic}`, explanation: hasFiles ? `From your uploaded materials (${fileNames}): every bolded term, definition, and named concept is exam-critical.` : `The fundamental definitions in ${topic} form the basis of all exam questions.`, whyItMatters: 'Precise definitions are the foundation — you cannot apply what you cannot define accurately.', commonMistake: 'Paraphrasing definitions loses the precision that examiners are testing for.', example: `Write each definition from memory. Anything you can't recall = top priority.` },
      { term: 'Mechanisms & Processes', explanation: `Understand step-by-step how things work in ${topic}. Exams ask you to trace a process or explain what happens at each stage.`, whyItMatters: 'Knowing the mechanism lets you predict outcomes and answer application questions.', commonMistake: 'Skipping intermediate steps and jumping to conclusions.', example: 'For each major process: input → transformation → output. Know every step.' },
      { term: 'Cause & Effect Chains', explanation: `In ${topic}, understand what causes what. When X changes, what happens to Y?`, whyItMatters: 'Causal reasoning is the difference between a passing and a top-scoring answer.', commonMistake: 'Reversing cause and effect — assuming correlation implies a specific direction.', example: 'For each concept: (1) what causes it, (2) what it causes, (3) what stops it.' },
    ],
    cheatSheet: [
      `${topic} — master all named concepts, exact definitions, and core terminology`,
      'Know every definition precisely — paraphrasing loses marks',
      'Identify all cause-and-effect relationships between major concepts',
      hasFiles ? `From ${fileNames}: extract all bolded terms, numbered lists, and italicized definitions` : 'Review all bolded terms and numbered lists in your notes',
    ],
    diagrams: [],
    stepByStep: [],
    codeExamples: [],
    formulas: [],
    workedExamples: [],
    likelyQuestions: [
      { question: `Define the core concepts of ${topic} and explain how they relate to each other`, answer: `Use precise definitions. Explain the relationships: how does concept A lead to or affect concept B?`, howToStructure: 'Define → Explain relationship → Give concrete example → State significance' },
    ],
    misconceptions: [
      { myth: 'Memorizing definitions is sufficient preparation', reality: 'Exams test application and causal reasoning. You must explain HOW and WHY, not just WHAT.', whyPeopleBelieveIt: 'Definitions feel concrete and checkable, so students stop there without testing deeper understanding.' },
    ],
    flashcards: [
      { front: `What is the central definition of the main concept in ${topic}?`, back: 'State the precise definition with all qualifying conditions.' },
      { front: `What causes the main process in ${topic}?`, back: 'Identify the trigger, the mechanism, and the outcome.' },
      { front: `What is the most common exam question structure in ${topic}?`, back: 'Define → Explain mechanism → Give example → State significance.' },
    ],
    mcqQuestions: [
      {
        question: `Which of the following BEST describes the core mechanism in ${topic}?`,
        options: { A: 'A surface-level description that misses the underlying cause', B: 'The correct mechanism — how the concept actually works at a fundamental level', C: 'A common misconception that reverses cause and effect', D: 'A related but distinct concept from a different context' },
        correct: 'B',
        explanation: 'B is correct because it describes the underlying mechanism, not just the surface phenomenon. A is wrong — it describes the symptom, not the cause. C reverses the causal direction, which is the most common mistake. D is a separate concept that students often confuse with this one.',
      },
      {
        question: `A student applies the main principle of ${topic} to a new scenario. What is the most critical thing they must check first?`,
        options: { A: 'Whether the formula or definition they memorized matches the question wording', B: 'Whether all the preconditions and assumptions of the principle are satisfied', C: 'Whether the answer matches what they expect intuitively', D: 'Whether they have enough time left to show all their work' },
        correct: 'B',
        explanation: 'B is correct — principles and rules in most subjects only apply under specific conditions. Checking preconditions prevents misapplication. A describes memorization, not understanding. C and D describe test-taking tactics, not the analytical process.',
      },
    ],
    examStrategy: [
      `In ${topic}, always begin your answer by stating the precise definition of the key term being asked about. Examiners mark on terminology first.`,
      `For ${topic} questions that ask you to "explain" — use the structure: Define → Mechanism → Example → Significance. This covers all mark-scheme criteria.`,
      `The most common exam trap in ${topic} is confusing correlation with causation, or reversing the direction of a relationship. Always specify which variable causes which.`,
      `Allocate marks proportionally: a 10-mark question expects roughly 10 distinct, substantive points or a developed argument of equivalent depth.`,
    ],
    mnemonics: [
      { concept: `Core principle of ${topic}`, device: 'D-M-E-S: Define, Mechanism, Example, Significance — the four things every exam answer needs', howToUse: 'When you read any ${topic} question, silently run through DMES to ensure your answer covers all marks.' },
      { concept: 'Causal vs. correlational reasoning', device: '"Cause Comes Before, Correlation Could Be Either" — if A → B, then A must precede B in a logical chain', howToUse: 'Before writing any causal claim, ask: does A actually produce B, or do they just co-occur?' },
    ],
    summary: `${topic} — the three things you cannot forget: (1) precise definitions with all conditions, (2) the causal mechanisms (what causes what and why), and (3) at least one concrete example for every major concept.`,
  }
}

// ─── Storage helpers ──────────────────────────────────────────────────────────
const COURSE_CLUTCH_KEY = (courseId) => `clutch-result-course-${courseId}`

export function saveClutchResultForCourse(courseId, { topic, result, filesUsed, courseName }) {
  if (!courseId) return
  localStorage.setItem(COURSE_CLUTCH_KEY(courseId), JSON.stringify({ topic, result, filesUsed, courseName, savedAt: new Date().toISOString() }))
}

export function loadClutchResultForCourse(courseId) {
  if (!courseId) return null
  try { return JSON.parse(localStorage.getItem(COURSE_CLUTCH_KEY(courseId)) || 'null') } catch { return null }
}

export function clearClutchResultForCourse(courseId) {
  if (!courseId) return
  localStorage.removeItem(COURSE_CLUTCH_KEY(courseId))
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const BG = '#080a0e'
const BLUE = '#3b82f6'
const CYAN = '#06b6d4'
const AMBER = '#f59e0b'
const RED = '#ef4444'
const GREEN = '#34d399'
const ease = [0.16, 1, 0.3, 1]

const LOADING_STEPS = ['Reading your materials...', 'Detecting subject type...', 'Building concept map...', 'Writing exam questions...', 'Generating practice quiz...', 'Finalizing guide...']

// ─── LoadingRing ──────────────────────────────────────────────────────────────
function LoadingRing({ size, color, duration, reverse = false, offset = 0 }) {
  return (
    <>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes spin-r{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}`}</style>
      <div style={{ position: 'absolute', top: offset, left: offset, right: offset, bottom: offset, width: size - offset * 2, height: size - offset * 2, borderRadius: '50%', border: `2px solid transparent`, borderTopColor: color, borderRightColor: `${color}33`, animation: `${reverse ? 'spin-r' : 'spin'} ${duration}s linear infinite` }} />
    </>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ClutchMode() {
  const location = useLocation()
  const { courses } = useCourses()
  const { sessions, addSession } = useSessions()
  const preload = location.state || {}

  const [step, setStep] = useState('input')
  const [selectedCourseId, setSelectedCourseId] = useState(preload.courseId || '')
  const [topic, setTopic] = useState('')
  const [courseLevel, setCourseLevel] = useState('undergraduate')
  const [examType, setExamType] = useState('mixed')
  const [focusAreas, setFocusAreas] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [result, setResult] = useState(null)
  const [loadingStep, setLoadingStep] = useState(0)
  const [binaryFileName, setBinaryFileName] = useState(null)
  const [binaryPasteText, setBinaryPasteText] = useState('')
  const [showBinaryModal, setShowBinaryModal] = useState(false)
  const [sessionsOpen, setSessionsOpen] = useState(false)
  const [sessionSaved, setSessionSaved] = useState(false)

  const loadingRef = useRef(null)
  const fileInputRef = useRef()

  const selectedCourse = courses.find(c => c.id === selectedCourseId)
  const courseName = selectedCourse?.name || preload.courseName || ''
  const courseId = selectedCourse?.id || preload.courseId || ''

  useEffect(() => {
    if (preload.materials?.length > 0 && uploadedFiles.length === 0) {
      setUploadedFiles(preload.materials.map(m => ({ id: m.id || crypto.randomUUID(), name: m.name, content: m.content || '', type: m.type || 'text/plain', fromCourse: true })))
    }
  }, [])

  useEffect(() => {
    if (selectedCourse?.materials?.length > 0) {
      const courseFiles = selectedCourse.materials.map(m => ({ id: m.id, name: m.name, content: m.content || '', type: m.type || 'text/plain', fromCourse: true }))
      setUploadedFiles(prev => [...courseFiles, ...prev.filter(f => !f.fromCourse)])
    } else {
      setUploadedFiles(prev => prev.filter(f => !f.fromCourse))
    }
  }, [selectedCourseId])

  useEffect(() => {
    if (step !== 'loading') return
    let i = 0
    loadingRef.current = setInterval(() => { i = (i + 1) % LOADING_STEPS.length; setLoadingStep(i) }, 900)
    return () => clearInterval(loadingRef.current)
  }, [step])

  const handleFileRead = useCallback((file) => {
    return new Promise((resolve) => {
      const name = file.name.toLowerCase()
      const isBinary = name.endsWith('.pptx') || name.endsWith('.ppt') || name.endsWith('.docx') || name.endsWith('.doc')
      const isPDF = name.endsWith('.pdf') || file.type === 'application/pdf'
      if (isBinary) { setBinaryFileName(file.name); setShowBinaryModal(true); resolve({ id: crypto.randomUUID(), name: file.name, content: '', type: file.type, fromCourse: false, needsPaste: true }); return }
      if (isPDF) {
        extractPDFText(file).then(text => resolve({ id: crypto.randomUUID(), name: file.name, content: text, type: file.type, fromCourse: false })).catch(() => resolve({ id: crypto.randomUUID(), name: file.name, content: '', type: file.type, fromCourse: false }))
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => resolve({ id: crypto.randomUUID(), name: file.name, content: e.target.result, type: file.type, fromCourse: false })
      reader.onerror = () => resolve({ id: crypto.randomUUID(), name: file.name, content: '', type: file.type, fromCourse: false })
      reader.readAsText(file)
    })
  }, [])

  const handleFiles = useCallback(async (files) => {
    const parsed = await Promise.all(Array.from(files).map(handleFileRead))
    setUploadedFiles(prev => [...prev, ...parsed.filter(f => !prev.some(p => p.name === f.name))])
  }, [handleFileRead])

  const handleDrop = useCallback((e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files) }, [handleFiles])
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)
  const removeFile = (id) => setUploadedFiles(prev => prev.filter(f => f.id !== id))

  const saveBinaryPaste = () => {
    setUploadedFiles(prev => prev.map(f => f.name === binaryFileName ? { ...f, content: binaryPasteText, needsPaste: false } : f))
    setBinaryPasteText(''); setBinaryFileName(null); setShowBinaryModal(false)
  }

  const generate = async () => {
    if (!topic.trim() && uploadedFiles.length === 0) return
    setStep('loading'); setLoadingStep(0)
    const files = uploadedFiles.map(f => ({ name: f.name, type: f.type, content: (f.content || '').slice(0, 8000) }))
    const courseCtx = selectedCourse ? { name: selectedCourse.name, code: selectedCourse.code, professor: selectedCourse.professor } : preload.courseName ? { name: preload.courseName, code: preload.courseCode } : null
    const effectiveTopic = topic || selectedCourse?.name || preload.courseName || 'General Study'
    const fileContext = files.map(f => `--- FILE: ${f.name} ---\n${f.content}`).join('\n\n')
    let data = null
    try {
      setLoadingStep(1)
      const prompt = `You are the best professor who ever taught — the one students remember for life because you made everything click. Your job is not to summarize. Your job is to TEACH. Create a study guide so complete and so clear that a student who reads it could walk into an exam tomorrow and ace it.

TOPIC: "${effectiveTopic}"
${courseCtx ? `COURSE: ${courseCtx.name} (${courseCtx.code || ''})${courseCtx.professor ? ` — Prof. ${courseCtx.professor}` : ''}` : ''}
EXAM TYPE: ${examType || 'mixed'} | LEVEL: ${courseLevel || 'undergraduate'}
${focusAreas ? `STUDENT SPECIFICALLY STRUGGLES WITH: ${focusAreas}` : ''}
${fileContext ? `\nUPLOADED MATERIALS — TREAT THESE AS GROUND TRUTH. Extract exact terminology, definitions, dates, names, formulas, and examples directly from this content:\n${fileContext.slice(0, 14000)}` : ''}

STEP 1 — Detect content type:
- "technical": math, CS, programming, physics, chemistry, engineering, statistics, econometrics
- "conceptual": history, philosophy, biology (descriptive), psychology, literature, law, political science, sociology, art history
- "mixed": business, general science, economics (qualitative), nursing, social sciences

STEP 2 — Return ONLY valid JSON with this exact schema:
{
  "contentType": "technical|conceptual|mixed",

  "plainEnglish": "5-7 flowing paragraphs. NO bullet points. Tell the STORY of this subject like a great professor. Open with the BIG PICTURE — why does this subject exist, what problem does it solve? Then build up the key ideas with vivid real-world analogies. Show how concepts connect and depend on each other. End with what this means for the exam. Write like you're at a coffee shop explaining to a brilliant friend who never took this class.",

  "teacherNotes": ["4-6 strings. These are the professor insights that never appear in textbooks — the 'by the way' moments. Exam traps. Why the hardest part trips people up. Deep connections between concepts. The pattern examiners test most. Be brutally specific to THIS exact material."],

  "coreConcepts": [{"term": "exact term from material", "explanation": "4-6 sentences. Explain the MECHANISM — how it actually works, not just what it is. Use a concrete analogy. Cover all edge cases.", "whyItMatters": "Why this concept is load-bearing for everything else in the subject", "commonMistake": "The exact wrong way students think about this — be specific", "example": "A vivid, concrete, real-world example with enough detail to be instructive"}],

  "cheatSheet": ["15-22 items. Each one a SPECIFIC fact, rule, definition, date, name, or relationship directly from the material — not generic study advice. If materials were uploaded, extract exact content from them."],

  "diagrams": [{"title": "string", "type": "flowchart|timeline|comparison|hierarchy|cycle", "description": "string", "nodes": [{"id": "string", "label": "string", "detail": "string"}], "edges": [{"from": "string", "to": "string", "label": "string"}], "events": [{"date": "string", "title": "string", "detail": "string"}], "columns": ["string"], "rows": [["string"]], "phases": [{"label": "string", "detail": "string"}]}],

  "stepByStep": [{"title": "string", "context": "string — when to use this procedure", "steps": ["string — complete, specific step"]}],

  "codeExamples": [{"language": "string", "title": "string", "code": "string", "explanation": "string"}],

  "formulas": [{"name": "string", "formula": "string", "whenToUse": "string — the exact situation", "variables": "string — what each variable means", "derivation": "string — intuition for why this formula works"}],

  "workedExamples": [{"problem": "string — a realistic exam-style problem", "approach": "string — how to recognize what type of problem this is and what strategy to use", "solution": "string — complete step-by-step solution with every step shown and explained", "keyInsight": "string — the one thing that makes this problem click"}],

  "likelyQuestions": [{"question": "string — exam-realistic question at ${courseLevel} level. Mix: 30% define/explain, 40% apply/analyze, 30% compare/evaluate/predict", "answer": "string — a model answer showing exactly the depth and structure an A-grade response requires. Write what a top student would write.", "howToStructure": "string — tactical advice: what to write first, key terms to include, common ways to lose marks"}],

  "misconceptions": [{"myth": "string — a specific wrong belief students have, stated as they would say it", "reality": "string — the correct understanding, explained clearly", "whyPeopleBelieveIt": "string — the psychological reason this mistake is so common"}],

  "flashcards": [{"front": "string — term, concept, or question — short and specific", "back": "string — precise answer or definition with a concrete example"}],

  "mcqQuestions": [{"question": "string — a specific, application-level question. Not 'what is X' but 'in situation Y, what happens to X?'", "options": {"A": "string — plausible distractor", "B": "string — plausible distractor", "C": "string — correct answer (randomize which letter is correct)", "D": "string — plausible distractor"}, "correct": "C", "explanation": "string — explain why the correct answer is right. Then explain why each wrong option is wrong. Be specific."}],

  "examStrategy": ["string — a specific, actionable exam tip for THIS exact subject and exam type. Not generic advice. Tell them exactly what to do: what to write first, what keywords to include, how to structure an answer, how to check their work, what examiners mark on."],

  "mnemonics": [{"concept": "string — the exact term or concept to remember", "device": "string — the mnemonic: acronym, rhyme, story, visual hook, or analogy that makes it stick", "howToUse": "string — how to retrieve and deploy this during an exam"}],

  "summary": "3-4 sentences. The absolute essence: if you only have 5 minutes before the exam, here is what you cannot afford to forget."
}

DIAGRAM RULES:
- "flowchart": nodes (id+label+detail) + edges (from+to+label). For processes, algorithms, cause-effect.
- "timeline": events (date+title+detail). For history, chronological sequences.
- "comparison": columns + rows 2D array. For comparing 3+ items across attributes.
- "hierarchy": nodes + edges with parent-child. For taxonomies, classifications.
- "cycle": phases (label+detail). For repeating processes (cell cycle, business cycle, etc.).

CONTENT-TYPE OUTPUT RULES:
TECHNICAL: 4-6 complete workedExamples with every step shown. Strong stepByStep. codeExamples if CS/programming. 8-12 mcqQuestions at application level. Mnemonics for formulas.
CONCEPTUAL: Rich plainEnglish (6-7 paragraphs, vivid analogies). 3-5 diagrams (timeline/comparison/hierarchy). Deep coreConcepts. 10-12 mcqQuestions testing interpretation and application. Mnemonics for key terms and sequences.
MIXED: Balance all sections. 8-10 mcqQuestions.

NON-NEGOTIABLE QUALITY STANDARDS:
1. If materials were uploaded: every fact, definition, formula, and example MUST come from those materials. Do not invent content.
2. coreConcepts: minimum 6, maximum 10. Teach the mechanism — HOW it works, not just WHAT it is.
3. cheatSheet: minimum 15 SPECIFIC facts from the actual subject. Zero generic study tips.
4. mcqQuestions: minimum 8, maximum 12. EXACTLY 30% recall / 40% application / 30% analysis. Each wrong option must be a plausible distractor — not obviously wrong.
5. likelyQuestions: minimum 7, maximum 10. Model answers must show what a top-grade response looks like in full.
6. examStrategy: minimum 4 tips, each specific to THIS subject. Zero generic tips like "read carefully."
7. flashcards: minimum 10 cards. Front = specific term or question. Back = precise answer + example.
8. Every single section must reference THIS specific topic — not a generic template.`

      const token = await getAuthToken()
      const res = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.2, max_tokens: 8000 }),
      })
      setLoadingStep(2)
      if (res.status === 429) { const { error } = await res.json().catch(() => ({})); setStep('input'); alert(error || 'Daily AI limit reached. Resets at midnight.'); return }
      if (res.ok) { const json = await res.json(); data = JSON.parse(json.choices[0].message.content); setLoadingStep(3) }
    } catch (e) { console.warn('Groq error, using fallback:', e) }

    if (!data) { await new Promise(r => setTimeout(r, 1800)); data = generateFallback(effectiveTopic, uploadedFiles) }

    setResult(data); setStep('result'); setSessionSaved(false)

    // Save last result per course (replaces previous one for that course)
    if (courseId) {
      saveClutchResultForCourse(courseId, {
        topic: effectiveTopic,
        result: data,
        filesUsed: uploadedFiles.map(f => f.name),
        courseName: courseName || effectiveTopic,
      })
    }

    addSession({ courseId, courseName, topic: effectiveTopic, filesUsed: uploadedFiles.map(f => f.name), result: data })
    setSessionSaved(true)
  }

  const resetAll = () => {
    setStep('input'); setResult(null)
    setTopic(''); setFocusAreas('')
    setSessionSaved(false)
  }

  const restoreSession = (session) => {
    setResult(session.result); setStep('result')
    setSelectedCourseId(session.courseId || ''); setTopic(session.topic || '')
    setSessionSaved(true); setSessionsOpen(false)
  }

  const canGenerate = topic.trim() || uploadedFiles.length > 0 || selectedCourseId
  const fileIcon = (type = '', name = '') => {
    if (type.includes('pdf') || name.endsWith('.pdf')) return '📄'
    if (name.endsWith('.pptx') || name.endsWith('.ppt')) return '📊'
    if (name.endsWith('.docx') || name.endsWith('.doc')) return '📝'
    return '📋'
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: BG, minHeight: '100vh', color: '#fff', fontFamily: 'inherit', position: 'relative' }}>
      <style>{`@keyframes clutch-scan{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}`}</style>

      {/* Binary paste modal */}
      {showBinaryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#0d0f14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '28px', maxWidth: 500, width: '100%' }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: AMBER, letterSpacing: '0.2em', marginBottom: 8, fontFamily: 'monospace' }}>BINARY FORMAT</div>
            <h3 style={{ fontSize: 17, fontWeight: 900, color: 'white', marginBottom: 6 }}>{binaryFileName}</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>Paste the text content of this file below</p>
            <textarea rows={7} value={binaryPasteText} onChange={e => setBinaryPasteText(e.target.value)} placeholder="Paste content here..."
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={saveBinaryPaste} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontWeight: 800, fontSize: 13, background: `linear-gradient(135deg,${BLUE},${CYAN})`, color: '#fff', border: 'none', cursor: 'pointer' }}>Save Text</button>
              <button onClick={() => setShowBinaryModal(false)} style={{ padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 13, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Sessions panel */}
      <AnimatePresence>
        {sessionsOpen && (
          <motion.div initial={{ x: 320 }} animate={{ x: 0 }} exit={{ x: 320 }} transition={{ duration: 0.35, ease }}
            style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 300, zIndex: 50, background: '#0a0c10', borderLeft: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontSize: 9, fontWeight: 900, color: BLUE, letterSpacing: '0.2em', fontFamily: 'monospace' }}>PAST SESSIONS</span>
              <button onClick={() => setSessionsOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            {sessions.length === 0 ? <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>No sessions yet.</p>
              : sessions.map(s => (
                <button key={s.id} onClick={() => restoreSession(s)}
                  style={{ width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px', marginBottom: 8, cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{s.topic || 'Untitled'}</p>
                  {s.courseName && <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginBottom: 3 }}>{s.courseName}</p>}
                  <p style={{ color: BLUE, fontSize: 10 }}>{new Date(s.savedAt).toLocaleDateString()} · {s.filesUsed?.length || 0} files</p>
                </button>
              ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════ INPUT ══════════════ */}
      {step === 'input' && (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 120px' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: BLUE, letterSpacing: '0.25em', fontFamily: 'monospace', marginBottom: 12 }}>SCENE 00 — BRIEFING</div>
            <h1 style={{ fontSize: 'clamp(28px,5vw,44px)', fontWeight: 900, letterSpacing: '-0.045em', color: 'white', margin: 0, lineHeight: 1 }}>Clutch Mode</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 10 }}>Upload your materials. Get a complete study guide built around exactly what you're learning.</p>
          </motion.div>

          {courses.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, ease }}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px', marginBottom: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', fontFamily: 'monospace', marginBottom: 12 }}>COURSE</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button onClick={() => setSelectedCourseId('')} style={{ padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: !selectedCourseId ? 'rgba(255,255,255,0.1)' : 'transparent', color: !selectedCourseId ? '#fff' : 'rgba(255,255,255,0.4)', border: `1px solid ${!selectedCourseId ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)'}`, transition: 'all 0.15s' }}>General</button>
                {courses.map(c => (
                  <button key={c.id} onClick={() => setSelectedCourseId(c.id)} style={{ padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: selectedCourseId === c.id ? `${c.color}18` : 'transparent', color: selectedCourseId === c.id ? c.color : 'rgba(255,255,255,0.4)', border: `1px solid ${selectedCourseId === c.id ? c.color + '40' : 'rgba(255,255,255,0.07)'}`, transition: 'all 0.15s' }}>{c.code}</button>
                ))}
              </div>
              {selectedCourse?.materials?.length > 0 && <p style={{ fontSize: 11, color: GREEN, marginTop: 10 }}>✓ {selectedCourse.materials.length} file{selectedCourse.materials.length !== 1 ? 's' : ''} from {selectedCourse.code} loaded</p>}
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, ease }}
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px', marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', fontFamily: 'monospace', marginBottom: 12 }}>TOPIC</div>
            <input type="text" value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && canGenerate && generate()}
              placeholder="e.g., Cell Division, Dynamic Programming, WW2, Supply & Demand..."
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: 'white', padding: '11px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = `${BLUE}60`} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, ease }}
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px', marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', fontFamily: 'monospace', marginBottom: 12 }}>UPLOAD MATERIALS <span style={{ color: 'rgba(255,255,255,0.18)', fontWeight: 400, textTransform: 'none', fontSize: 10, letterSpacing: 0 }}>notes, slides, PDFs</span></div>
            <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.pdf,.pptx,.docx,.csv,.rtf" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
            <div onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={() => fileInputRef.current?.click()}
              style={{ border: `1.5px dashed ${isDragging ? BLUE : 'rgba(255,255,255,0.12)'}`, borderRadius: 12, padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', background: isDragging ? 'rgba(59,130,246,0.05)' : 'transparent', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}>
              {isDragging && <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, transparent, ${BLUE}08, transparent)`, animation: 'clutch-scan 1.5s linear infinite' }} />}
              <div style={{ width: 40, height: 40, borderRadius: 10, background: isDragging ? `${BLUE}18` : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={isDragging ? BLUE : 'rgba(255,255,255,0.35)'} strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
              </div>
              <p style={{ color: isDragging ? BLUE : 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: 13 }}>{isDragging ? 'Drop files' : 'Drag & drop or click'}</p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>.txt .md .pdf .pptx .docx</p>
            </div>
            {uploadedFiles.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {uploadedFiles.map(f => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: f.fromCourse ? 'rgba(52,211,153,0.05)' : 'rgba(255,255,255,0.03)', border: `1px solid ${f.fromCourse ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.06)'}` }}>
                    <span style={{ fontSize: 14 }}>{fileIcon(f.type, f.name)}</span>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    {f.needsPaste && <button onClick={() => { setBinaryFileName(f.name); setShowBinaryModal(true) }} style={{ fontSize: 10, fontWeight: 700, color: AMBER, background: `${AMBER}10`, border: `1px solid ${AMBER}25`, borderRadius: 6, padding: '2px 7px', cursor: 'pointer' }}>Paste text</button>}
                    {f.fromCourse && selectedCourse && <span style={{ fontSize: 10, fontWeight: 700, color: GREEN, background: `${GREEN}10`, borderRadius: 6, padding: '2px 7px' }}>{selectedCourse.code}</span>}
                    {!f.fromCourse && <button onClick={() => removeFile(f.id)} style={{ width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer' }}>✕</button>}
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, ease }}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px' }}>
              <div style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', fontFamily: 'monospace', marginBottom: 12 }}>LEVEL</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[['highschool', 'High School'], ['undergraduate', 'Undergrad'], ['graduate', 'Graduate']].map(([v, l]) => (
                  <button key={v} onClick={() => setCourseLevel(v)} style={{ padding: '9px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, textAlign: 'left', cursor: 'pointer', background: courseLevel === v ? `linear-gradient(135deg,${BLUE},${CYAN})` : 'rgba(255,255,255,0.04)', color: courseLevel === v ? '#fff' : 'rgba(255,255,255,0.45)', border: courseLevel === v ? 'none' : '1px solid rgba(255,255,255,0.07)', transition: 'all 0.15s' }}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px' }}>
              <div style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', fontFamily: 'monospace', marginBottom: 12 }}>EXAM TYPE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[['multiple-choice', 'Multiple Choice'], ['short-answer', 'Short Answer'], ['essay', 'Essay'], ['mixed', 'Mixed']].map(([v, l]) => (
                  <button key={v} onClick={() => setExamType(v)} style={{ padding: '9px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, textAlign: 'left', cursor: 'pointer', background: examType === v ? `linear-gradient(135deg,${BLUE},${CYAN})` : 'rgba(255,255,255,0.04)', color: examType === v ? '#fff' : 'rgba(255,255,255,0.45)', border: examType === v ? 'none' : '1px solid rgba(255,255,255,0.07)', transition: 'all 0.15s' }}>{l}</button>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, ease }}
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px', marginBottom: 24 }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', fontFamily: 'monospace', marginBottom: 12 }}>WHAT CONFUSES YOU <span style={{ color: 'rgba(255,255,255,0.15)', fontWeight: 400, textTransform: 'none', fontSize: 10, letterSpacing: 0 }}>optional</span></div>
            <textarea value={focusAreas} onChange={e => setFocusAreas(e.target.value)} rows={2} placeholder="e.g., I don't understand how entropy works, or when to use integration by parts..."
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#fff', fontSize: 13, padding: '10px 14px', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
          </motion.div>

          <motion.button whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }} onClick={generate} disabled={!canGenerate}
            style={{ width: '100%', padding: '16px 0', borderRadius: 14, fontSize: 13, fontWeight: 900, letterSpacing: '0.1em', background: canGenerate ? `linear-gradient(135deg,${BLUE},${CYAN})` : 'rgba(255,255,255,0.05)', color: canGenerate ? '#fff' : 'rgba(255,255,255,0.2)', border: 'none', cursor: canGenerate ? 'pointer' : 'not-allowed', boxShadow: canGenerate ? `0 0 30px ${BLUE}35` : 'none', transition: 'all 0.2s' }}>
            {uploadedFiles.length > 0 ? `BEGIN SESSION — ${uploadedFiles.length} FILE${uploadedFiles.length !== 1 ? 'S' : ''} →` : 'BEGIN SESSION →'}
          </motion.button>
        </div>
      )}

      {/* ══════════════ LOADING ══════════════ */}
      {step === 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 28, padding: 24 }}>
          <div style={{ position: 'relative', width: 90, height: 90 }}>
            <LoadingRing size={90} color={BLUE} duration={2} />
            <LoadingRing size={64} color={CYAN} duration={3} reverse offset={13} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={BLUE} strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: BLUE, fontWeight: 900, letterSpacing: '0.22em', fontFamily: 'monospace', marginBottom: 14 }}>ANALYZING</div>
            <AnimatePresence mode="wait">
              <motion.p key={loadingStep} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
                style={{ fontSize: 20, fontWeight: 900, color: 'white', letterSpacing: '-0.03em', marginBottom: 6 }}>
                {LOADING_STEPS[loadingStep]}
              </motion.p>
            </AnimatePresence>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>{uploadedFiles.length > 0 ? `${uploadedFiles.length} file${uploadedFiles.length !== 1 ? 's' : ''} · ${courseName || topic}` : topic}</p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {LOADING_STEPS.map((_, i) => (
              <div key={i} style={{ width: 28, height: 3, borderRadius: 2, background: i <= loadingStep ? BLUE : 'rgba(255,255,255,0.08)', transition: 'background 0.4s', boxShadow: i <= loadingStep ? `0 0 8px ${BLUE}` : 'none' }} />
            ))}
          </div>
        </div>
      )}

      {/* ══════════════ RESULTS ══════════════ */}
      {step === 'result' && result && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 120px' }}>
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: GREEN, letterSpacing: '0.22em', fontFamily: 'monospace', marginBottom: 10 }}>SESSION COMPLETE{courseId ? ' · SAVED TO COURSE' : ''}</div>
            <h1 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 900, letterSpacing: '-0.04em', color: 'white', margin: 0 }}>
              {topic || courseName || 'Your Study Guide'}
            </h1>
          </motion.div>

          <ClutchResultView result={result} topic={topic} courseName={courseName} uploadedFiles={uploadedFiles} />

          {/* Bottom bar */}
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(8,10,14,0.96)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 40 }}>
            <span style={{ fontSize: 11, color: sessionSaved ? GREEN : 'rgba(255,255,255,0.25)', fontWeight: 700 }}>
              {sessionSaved ? `✓ Saved${courseId ? ' to course' : ''}` : '○ Saving...'}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setSessionsOpen(s => !s)} style={{ padding: '8px 14px', borderRadius: 9, fontSize: 11, fontWeight: 700, background: sessionsOpen ? `${BLUE}18` : 'rgba(255,255,255,0.05)', color: sessionsOpen ? BLUE : 'rgba(255,255,255,0.5)', border: `1px solid ${sessionsOpen ? BLUE + '35' : 'rgba(255,255,255,0.07)'}`, cursor: 'pointer', transition: 'all 0.2s' }}>
                Past Sessions {sessions.length > 0 && `(${sessions.length})`}
              </button>
              <button onClick={resetAll} style={{ padding: '8px 14px', borderRadius: 9, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}>
                New Session ↺
              </button>
            </div>
          </div>
          <div style={{ height: 72 }} />
        </div>
      )}
    </div>
  )
}
