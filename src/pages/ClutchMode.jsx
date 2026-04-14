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

// ─── Vision/OCR text extraction ───────────────────────────────────────────────
async function extractTextWithVision(imageDataUrl) {
  try {
    const token = await getAuthToken()
    const res = await fetch('/api/groq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        model: 'llama-3.2-11b-vision-preview',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageDataUrl } },
            { type: 'text', text: 'Extract ALL text from this image exactly as written. Include every word, number, formula, equation, diagram label, heading, and bullet point. Preserve the structure. Output only the extracted text, nothing else.' }
          ]
        }],
        temperature: 0,
        max_tokens: 4000,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || null
  } catch { return null }
}

// Render a PDF page to a JPEG data URL for vision extraction
async function renderPDFPageAsImage(pdfDoc, pageNum) {
  try {
    const page = await pdfDoc.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1.8 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    return canvas.toDataURL('image/jpeg', 0.85)
  } catch { return null }
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

const LOADING_STEPS = ['Reading your materials...', 'Identifying key concepts...', 'Writing your lecture...', 'Building practice questions...', 'Generating quiz...', 'Finishing your course pack...']

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
  const { courses, addMaterial } = useCourses()
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
  const [generateError, setGenerateError] = useState(null)
  const [binaryFileName, setBinaryFileName] = useState(null)
  const [binaryPasteText, setBinaryPasteText] = useState('')
  const [showBinaryModal, setShowBinaryModal] = useState(false)
  const [sessionsOpen, setSessionsOpen] = useState(false)
  const [sessionSaved, setSessionSaved] = useState(false)
  const [contentWarning, setContentWarning] = useState(null) // { issues, totalChars, canProceed }

  // ── Content validation ────────────────────────────────────────────────────────
  const MAX_PER_FILE = 40000
  const MAX_TOTAL = 90000

  const validateContent = () => {
    const issues = []
    let totalChars = 0
    let hasAnyContent = false

    for (const f of uploadedFiles) {
      const len = (f.content || '').length
      totalChars += Math.min(len, MAX_PER_FILE)

      if (f.needsPaste) {
        issues.push({ type: 'no-paste', file: f.name, msg: `"${f.name}" — content was never pasted in. It will be skipped.` })
      } else if (len === 0 && !f.needsPaste) {
        issues.push({ type: 'empty', file: f.name, msg: `"${f.name}" — no text could be extracted. This is likely a scanned/image-based PDF. Convert it to text or copy-paste the content manually.` })
      } else if (len < 400 && !f.needsPaste) {
        hasAnyContent = true
        issues.push({ type: 'sparse', file: f.name, msg: `"${f.name}" — only ${len} characters extracted. This is very little content. The file may be mostly images, have unusual encoding, or be a scanned PDF. CLUTCH may generate generic output for this file.` })
      } else {
        hasAnyContent = true
        if (len > MAX_PER_FILE) {
          const pct = Math.round((MAX_PER_FILE / len) * 100)
          issues.push({ type: 'trimmed', file: f.name, msg: `"${f.name}" is ${Math.round(len / 1000)}k characters — only the first ${pct}% will be used (first ~${Math.round(MAX_PER_FILE / 1000)}k chars).` })
        }
      }
    }

    const allFilesEmpty = uploadedFiles.length > 0 && !hasAnyContent
    if (allFilesEmpty) {
      issues.push({ type: 'all-empty', msg: 'None of your uploaded files contain extractable text. CLUTCH will generate from your topic name only, with no course-specific content.' })
    }

    const totalRaw = uploadedFiles.reduce((s, f) => s + (f.content || '').length, 0)
    const canProceed = !allFilesEmpty || topic.trim()
    return { issues, totalChars, totalRaw, canProceed, hasWarnings: issues.length > 0 }
  }

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
    if (!selectedCourse) {
      setUploadedFiles(prev => prev.filter(f => !f.fromCourse))
      return
    }
    const allMaterials = selectedCourse.materials || []
    const selectedIds = preload.selectedMaterialIds
    const materialsToLoad = selectedIds?.length > 0
      ? allMaterials.filter(m => selectedIds.includes(m.id))
      : allMaterials
    if (materialsToLoad.length > 0) {
      const courseFiles = materialsToLoad.map(m => ({
        id: m.id, name: m.name, content: m.content || '',
        type: m.type || 'text/plain', fromCourse: true,
      }))
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
      const isImage = /\.(jpg|jpeg|png|webp)$/i.test(name) || (file.type.startsWith('image/') && !file.type.includes('gif'))
      const isBinary = name.endsWith('.pptx') || name.endsWith('.ppt') || name.endsWith('.docx') || name.endsWith('.doc')
      const isPDF = name.endsWith('.pdf') || file.type === 'application/pdf'

      if (isImage) {
        const id = crypto.randomUUID()
        const fileObj = { id, name: file.name, content: '', type: file.type, fromCourse: false, extracting: true, extractMethod: 'vision' }
        resolve(fileObj)
        const reader = new FileReader()
        reader.onload = async (e) => {
          const text = await extractTextWithVision(e.target.result)
          setUploadedFiles(prev => prev.map(f => f.id === id ? { ...f, content: text || '', extracting: false } : f))
        }
        reader.onerror = () => setUploadedFiles(prev => prev.map(f => f.id === id ? { ...f, extracting: false } : f))
        reader.readAsDataURL(file)
        return
      }

      if (isBinary) {
        setBinaryFileName(file.name)
        setShowBinaryModal(true)
        resolve({ id: crypto.randomUUID(), name: file.name, content: '', type: file.type, fromCourse: false, needsPaste: true })
        return
      }

      if (isPDF) {
        const id = crypto.randomUUID()
        const fileObj = { id, name: file.name, content: '', type: file.type, fromCourse: false, extracting: true, extractMethod: 'pdf' }
        resolve(fileObj)
        file.arrayBuffer().then(async (buf) => {
          try {
            const pdf = await pdfjsLib.getDocument({ data: buf }).promise
            let text = ''
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i)
              const content = await page.getTextContent()
              text += content.items.map(item => item.str).join(' ') + '\n'
            }
            const avgCharsPerPage = text.trim().length / pdf.numPages
            if (avgCharsPerPage < 80) {
              // Likely scanned/image PDF — run vision OCR on up to 10 pages
              setUploadedFiles(prev => prev.map(f => f.id === id ? { ...f, extractMethod: 'ocr', extracting: true } : f))
              let ocrText = ''
              const pagesToOCR = Math.min(pdf.numPages, 10)
              for (let i = 1; i <= pagesToOCR; i++) {
                const imgUrl = await renderPDFPageAsImage(pdf, i)
                if (imgUrl) {
                  const pageText = await extractTextWithVision(imgUrl)
                  if (pageText) ocrText += `[Page ${i}]\n${pageText}\n\n`
                }
              }
              setUploadedFiles(prev => prev.map(f => f.id === id ? { ...f, content: ocrText, extracting: false } : f))
            } else {
              setUploadedFiles(prev => prev.map(f => f.id === id ? { ...f, content: text, extracting: false } : f))
            }
          } catch {
            setUploadedFiles(prev => prev.map(f => f.id === id ? { ...f, content: '', extracting: false } : f))
          }
        })
        return
      }

      // Plain text files
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

  const handleGenerate = () => {
    setGenerateError(null)
    if (!topic.trim() && uploadedFiles.length === 0) return
    // Block if any file is still extracting
    if (uploadedFiles.some(f => f.extracting)) {
      setGenerateError('Files are still being read — wait a moment and try again.')
      return
    }
    if (uploadedFiles.length > 0) {
      const validation = validateContent()
      if (validation.hasWarnings) {
        setContentWarning(validation)
        return
      }
    }
    generate()
  }

  const generate = async () => {
    setContentWarning(null)
    setGenerateError(null)
    if (!topic.trim() && uploadedFiles.length === 0) return
    setStep('loading'); setLoadingStep(0)
    const files = uploadedFiles.map(f => ({ name: f.name, type: f.type, content: (f.content || '').slice(0, 40000) }))
    const courseCtx = selectedCourse ? { name: selectedCourse.name, code: selectedCourse.code, professor: selectedCourse.professor } : preload.courseName ? { name: preload.courseName, code: preload.courseCode } : null
    const effectiveTopic = topic || selectedCourse?.name || preload.courseName || ''
    const fileContext = files.map(f => `--- FILE: ${f.name} ---\n${f.content}`).join('\n\n')

    // Debug: log exactly what we're sending
    console.log('[CLUTCH] Generating for topic:', effectiveTopic)
    console.log('[CLUTCH] Files:', files.map(f => `${f.name} (${f.content.length} chars)`))
    console.log('[CLUTCH] Total file chars:', files.reduce((s, f) => s + f.content.length, 0))

    let data = null
    let apiError = null
    try {
      setLoadingStep(1)
      const hasFiles = fileContext.trim().length > 0
      const prompt = `You are CLUTCH, an expert professor. Your job: read the student's uploaded materials and produce a complete study guide as valid JSON.

RULES:
- Every concept, example, question, and fact MUST come directly from the uploaded materials below.
- Do NOT invent, generalize, or use outside knowledge. Teach exactly what is in the materials.
- Output ONLY a JSON object. No markdown, no explanation outside the JSON.

SESSION:
Topic: ${effectiveTopic || files.map(f => f.name).join(', ') || 'Uploaded Materials'}
${courseCtx ? `Course: ${courseCtx.name}${courseCtx.code ? ` (${courseCtx.code})` : ''}` : ''}
Level: ${courseLevel || 'undergraduate'} | Exam type: ${examType || 'mixed'}
${focusAreas ? `Focus: ${focusAreas}` : ''}

${hasFiles ? `UPLOADED MATERIALS (extract and teach EVERYTHING from these):
${fileContext.slice(0, 80000)}` : 'No files uploaded — generate from topic name only.'}

JSON SCHEMA (fill every field based on the materials above):
{
  "contentType": "technical|conceptual|mixed",
  "plainEnglish": "5-6 teaching paragraphs. No bullet points. Teach every major concept from the materials in sequence. Use plain language + concrete examples. This is the lecture the student reads first.",
  "teacherNotes": ["4-5 key insights a professor would share after class. Specific to THIS material."],
  "coreConcepts": [
    {"term": "term from materials", "explanation": "3-4 sentences: what it is, how it works, why it matters", "whyItMatters": "one sentence", "commonMistake": "specific misconception", "example": "concrete example from the material"}
  ],
  "cheatSheet": ["10-15 standalone facts pulled directly from the materials. Each fact complete on its own."],
  "diagrams": [{"title":"string","type":"flowchart|timeline|comparison|hierarchy|cycle","description":"string","nodes":[{"id":"string","label":"string","detail":"string"}],"edges":[{"from":"string","to":"string","label":"string"}],"events":[{"date":"string","title":"string","detail":"string"}],"columns":["string"],"rows":[["string"]],"phases":[{"label":"string","detail":"string"}]}],
  "stepByStep": [{"title":"string","context":"when to use this","steps":["step 1","step 2"]}],
  "codeExamples": [{"language":"string","title":"string","code":"string","explanation":"string"}],
  "formulas": [{"name":"string","formula":"string","whenToUse":"string","variables":"string","derivation":"string"}],
  "workedExamples": [{"problem":"string","approach":"string","solution":"string","keyInsight":"string"}],
  "likelyQuestions": [{"question":"exam question from the material","answer":"complete model answer","howToStructure":"string"}],
  "misconceptions": [{"myth":"string","reality":"string","whyPeopleBelieveIt":"string"}],
  "flashcards": [{"front":"term or question","back":"definition or answer"}],
  "mcqQuestions": [{"question":"scenario-based question","options":{"A":"wrong","B":"wrong","C":"correct","D":"wrong"},"correct":"C","explanation":"why C is right and A/B/D are wrong"}],
  "examStrategy": ["3-4 subject-specific exam tips based on this material"],
  "mnemonics": [{"concept":"string","device":"string","howToUse":"string"}],
  "summary": "3-4 sentences: what this subject is really about and the 3 things the student cannot forget."
}

Counts: coreConcepts 5-8, cheatSheet 10-15, flashcards 8-12, mcqQuestions 5-8, likelyQuestions 3-5.
${!hasFiles ? 'Since no files were uploaded, base everything on the topic name and general knowledge.' : ''}`

      const token = await getAuthToken()
      const res = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.2, max_tokens: 16000 }),
      })
      setLoadingStep(2)
      if (res.status === 429) {
        const { error } = await res.json().catch(() => ({}))
        setStep('input')
        setGenerateError(error || 'Daily AI limit reached. Resets at midnight.')
        return
      }
      if (res.ok) {
        const json = await res.json()
        const raw = json.choices?.[0]?.message?.content || ''
        console.log('[CLUTCH] Raw response length:', raw.length, 'chars')
        try {
          data = JSON.parse(raw)
        } catch (parseErr) {
          console.error('[CLUTCH] JSON parse failed. First 500 chars:', raw.slice(0, 500))
          apiError = `The AI response was too long and got cut off. Try uploading smaller files or using the Focus Areas field to narrow the topic.`
        }
        setLoadingStep(3)
      } else {
        const errBody = await res.json().catch(() => ({}))
        apiError = errBody.error || `AI service error (${res.status}) — please try again`
        console.error('[CLUTCH] API error:', res.status, errBody)
      }
    } catch (e) {
      console.error('[CLUTCH] Network/fetch error:', e)
      apiError = e.message || 'Network error — check your connection and try again'
    }

    if (!data) {
      setStep('input')
      setGenerateError(apiError || 'Something went wrong — please try again')
      return
    }

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

    // Persist newly uploaded files into the course's saved materials
    if (courseId && addMaterial) {
      const existingNames = new Set((selectedCourse?.materials || []).map(m => m.name))
      for (const f of uploadedFiles) {
        if (!f.fromCourse && !f.needsPaste && (f.content || '').length > 100 && !existingNames.has(f.name)) {
          addMaterial(courseId, {
            name: f.name,
            content: (f.content || '').slice(0, 40000),
            type: f.type || 'text/plain',
            size: f.size || 0,
          })
        }
      }
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
    if (type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(name)) return '🖼'
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

      {/* Content warning modal */}
      <AnimatePresence>
        {contentWarning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <motion.div initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 16 }}
              style={{ background: '#0d0f14', border: '1px solid rgba(255,255,255,0.1)', borderTop: `2px solid ${AMBER}`, borderRadius: 18, padding: '28px 28px 24px', maxWidth: 520, width: '100%', boxShadow: `0 0 60px rgba(0,0,0,0.6)` }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${AMBER}18`, border: `1px solid ${AMBER}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>⚠️</div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.22em', color: AMBER, fontFamily: 'monospace', marginBottom: 4 }}>CONTENT CHECK</div>
                  <h3 style={{ fontSize: 16, fontWeight: 900, color: 'white', margin: 0, letterSpacing: '-0.02em' }}>Review before generating</h3>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '4px 0 0', lineHeight: 1.5 }}>
                    CLUTCH found issues with your uploaded materials. Proceeding without fixing these may result in generic output that doesn't reflect your actual course content.
                  </p>
                </div>
              </div>

              {/* Issues list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
                {contentWarning.issues.map((issue, i) => {
                  const isError = issue.type === 'empty' || issue.type === 'no-paste' || issue.type === 'all-empty'
                  const color = isError ? RED : AMBER
                  const icon = isError ? '✕' : '↓'
                  return (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '11px 14px', borderRadius: 10, background: `${color}08`, border: `1px solid ${color}20` }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color, flexShrink: 0, marginTop: 1 }}>{icon}</div>
                      <div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.5 }}>{issue.msg}</p>
                    {(issue.type === 'empty' || issue.type === 'sparse') && (
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '4px 0 0', lineHeight: 1.5 }}>
                        Fix: use a PDF with selectable text, or copy all text from the document and paste it as a .txt file.
                      </p>
                    )}
                  </div>
                    </div>
                  )
                })}
              </div>

              {/* Total size info */}
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 22 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}>Total content: </span>
                  {Math.round(contentWarning.totalRaw / 1000)}k characters raw
                  {contentWarning.totalRaw > MAX_TOTAL && (
                    <span style={{ color: AMBER }}> — trimmed to {Math.round(MAX_TOTAL / 1000)}k for the AI</span>
                  )}
                </div>
                {contentWarning.totalRaw > MAX_TOTAL && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                    Tip: upload fewer files or split large PDFs to get better coverage.
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setContentWarning(null)}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 10, fontWeight: 700, fontSize: 13, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
                  ← Go Back &amp; Fix
                </button>
                {contentWarning.canProceed && (
                  <button
                    onClick={generate}
                    style={{ flex: 1, padding: '11px 0', borderRadius: 10, fontWeight: 900, fontSize: 13, background: `linear-gradient(135deg,${AMBER},${RED})`, color: '#fff', border: 'none', cursor: 'pointer', letterSpacing: '0.04em' }}>
                    Proceed Anyway
                  </button>
                )}
              </div>
              {!contentWarning.canProceed && (
                <p style={{ fontSize: 11, color: RED, textAlign: 'center', marginTop: 12, margin: '12px 0 0' }}>
                  No usable content found. Go back, fix your files, or enter a topic name to generate from scratch.
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '0 0 60px' }}>
          <style>{`
            @keyframes zone-pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
            @keyframes file-in { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }
            .clutch-input-grid { display: grid; grid-template-columns: 1fr 420px; gap: 0; min-height: 100vh; }
            @media(max-width:880px){ .clutch-input-grid { grid-template-columns: 1fr; } }
          `}</style>

          <div className="clutch-input-grid">

            {/* LEFT — Drop zone */}
            <div style={{ borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', padding: '40px 32px', position: 'relative', overflow: 'hidden' }}>
              {/* ambient glow */}
              <div style={{ position: 'absolute', top: -80, left: -80, width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(ellipse, ${isDragging ? BLUE : 'rgba(59,130,246,0.12)'} 0%, transparent 70%)`, pointerEvents: 'none', transition: 'background 0.4s' }} />

              {/* header */}
              <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} style={{ marginBottom: 32, position: 'relative' }}>
                <div style={{ fontSize: 9, fontWeight: 900, color: BLUE, letterSpacing: '0.28em', fontFamily: 'monospace', marginBottom: 10 }}>[ CLUTCH MODE ]</div>
                <h1 style={{ fontSize: 'clamp(32px,4vw,52px)', fontWeight: 900, letterSpacing: '-0.05em', color: 'white', margin: '0 0 8px', lineHeight: 1 }}>Drop your<br /><span style={{ color: BLUE }}>materials.</span></h1>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.5 }}>PDFs, slides, notes, images — CLUTCH reads everything<br />and teaches you the entire course in one session.</p>
              </motion.div>

              {/* Drop zone */}
              <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.pdf,.pptx,.docx,.csv,.rtf,.jpg,.jpeg,.png,.webp" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.5, ease }}
                onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={() => fileInputRef.current?.click()}
                whileHover={{ borderColor: `${BLUE}70` }}
                style={{
                  flex: uploadedFiles.length === 0 ? 1 : 'none',
                  minHeight: uploadedFiles.length === 0 ? 280 : 140,
                  border: `2px dashed ${isDragging ? BLUE : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 20,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 12, cursor: 'pointer',
                  background: isDragging ? `${BLUE}08` : 'rgba(255,255,255,0.015)',
                  transition: 'all 0.25s',
                  position: 'relative', overflow: 'hidden',
                }}>
                {isDragging && (
                  <>
                    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, transparent, ${BLUE}12, transparent)`, animation: 'clutch-scan 1.2s linear infinite' }} />
                    <div style={{ position: 'absolute', inset: 0, border: `2px solid ${BLUE}`, borderRadius: 20, animation: 'zone-pulse 1s ease-in-out infinite' }} />
                  </>
                )}
                <motion.div animate={{ scale: isDragging ? 1.15 : 1, rotate: isDragging ? -8 : 0 }} transition={{ type: 'spring', stiffness: 300 }}
                  style={{ width: 56, height: 56, borderRadius: 16, background: isDragging ? `${BLUE}20` : 'rgba(255,255,255,0.04)', border: `1px solid ${isDragging ? BLUE + '50' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke={isDragging ? BLUE : 'rgba(255,255,255,0.4)'} strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </motion.div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: isDragging ? BLUE : 'rgba(255,255,255,0.65)', fontWeight: 800, fontSize: 15, margin: '0 0 4px' }}>{isDragging ? 'Release to upload' : 'Drag & drop files here'}</p>
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, margin: 0 }}>or click to browse</p>
                </div>
                {/* supported types row */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', padding: '0 20px' }}>
                  {['PDF', 'PPTX', 'DOCX', 'TXT', 'PNG', 'JPG'].map(t => (
                    <span key={t} style={{ fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>{t}</span>
                  ))}
                </div>
                {!isDragging && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: `${CYAN}08`, border: `1px solid ${CYAN}18` }}>
                    <span style={{ fontSize: 10 }}>👁</span>
                    <span style={{ fontSize: 10, color: CYAN, fontWeight: 700 }}>Images & scanned PDFs auto-extracted via AI vision</span>
                  </div>
                )}
              </motion.div>

              {/* File list */}
              <AnimatePresence>
                {uploadedFiles.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
                    <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.2)', marginBottom: 4, fontFamily: 'monospace' }}>{uploadedFiles.length} FILE{uploadedFiles.length !== 1 ? 'S' : ''} LOADED</div>
                    {uploadedFiles.map((f, idx) => {
                      const chars = (f.content || '').length
                      const isNeedsPaste = f.needsPaste
                      const isEmpty = !isNeedsPaste && !f.extracting && chars === 0
                      const isSuspicious = !isNeedsPaste && !f.extracting && chars > 0 && chars < 400
                      const isGood = !isNeedsPaste && !f.extracting && chars >= 400

                      let statusBadge = null
                      if (f.extracting) {
                        const label = f.extractMethod === 'ocr' ? '🔍 OCR scanning...' : f.extractMethod === 'vision' ? '👁 Reading image...' : '⏳ Extracting...'
                        statusBadge = <span style={{ fontSize: 10, fontWeight: 700, color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}25`, borderRadius: 6, padding: '2px 8px', flexShrink: 0 }}>{label}</span>
                      } else if (isNeedsPaste) {
                        statusBadge = <button onClick={(e) => { e.stopPropagation(); setBinaryFileName(f.name); setShowBinaryModal(true) }} style={{ fontSize: 10, fontWeight: 700, color: AMBER, background: `${AMBER}10`, border: `1px solid ${AMBER}25`, borderRadius: 6, padding: '2px 8px', cursor: 'pointer', flexShrink: 0 }}>Paste text ⚠</button>
                      } else if (isEmpty) {
                        statusBadge = <span style={{ fontSize: 10, fontWeight: 700, color: RED, background: `${RED}10`, border: `1px solid ${RED}25`, borderRadius: 6, padding: '2px 8px', flexShrink: 0 }}>✕ No text</span>
                      } else if (isSuspicious) {
                        statusBadge = <span style={{ fontSize: 10, fontWeight: 700, color: AMBER, background: `${AMBER}10`, border: `1px solid ${AMBER}25`, borderRadius: 6, padding: '2px 8px', flexShrink: 0 }}>⚠ {chars} chars</span>
                      } else if (isGood) {
                        const method = f.extractMethod === 'ocr' ? ' OCR' : f.extractMethod === 'vision' ? ' vision' : ''
                        statusBadge = <span style={{ fontSize: 10, fontWeight: 600, color: GREEN, background: `${GREEN}08`, border: `1px solid ${GREEN}18`, borderRadius: 6, padding: '2px 8px', flexShrink: 0 }}>✓ {chars >= 1000 ? `${Math.round(chars / 1000)}k` : chars}ch{method}</span>
                      }

                      return (
                        <motion.div key={f.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ delay: idx * 0.04, ease }}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: isEmpty ? `${RED}06` : isSuspicious ? `${AMBER}05` : f.fromCourse ? 'rgba(52,211,153,0.05)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isEmpty ? `${RED}20` : isSuspicious ? `${AMBER}20` : f.fromCourse ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.06)'}` }}>
                          <span style={{ fontSize: 16 }}>{fileIcon(f.type, f.name)}</span>
                          <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                          {statusBadge}
                          {f.fromCourse && selectedCourse && <span style={{ fontSize: 10, fontWeight: 700, color: GREEN, background: `${GREEN}10`, borderRadius: 6, padding: '2px 7px', flexShrink: 0 }}>{selectedCourse.code}</span>}
                          {!f.fromCourse && <button onClick={() => removeFile(f.id)} style={{ width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', flexShrink: 0, fontSize: 14 }}>✕</button>}
                        </motion.div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* RIGHT — Settings + Generate */}
            <div style={{ display: 'flex', flexDirection: 'column', padding: '40px 28px', gap: 16, background: 'rgba(0,0,0,0.2)' }}>

              {/* Course selector */}
              {courses.length > 0 && (
                <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, ease }}
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px' }}>
                  <div style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.22em', fontFamily: 'monospace', marginBottom: 10 }}>COURSE</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <button onClick={() => setSelectedCourseId('')} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: !selectedCourseId ? 'rgba(255,255,255,0.1)' : 'transparent', color: !selectedCourseId ? '#fff' : 'rgba(255,255,255,0.35)', border: `1px solid ${!selectedCourseId ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`, transition: 'all 0.15s' }}>General</button>
                    {courses.map(c => (
                      <button key={c.id} onClick={() => setSelectedCourseId(c.id)} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: selectedCourseId === c.id ? `${c.color}18` : 'transparent', color: selectedCourseId === c.id ? c.color : 'rgba(255,255,255,0.35)', border: `1px solid ${selectedCourseId === c.id ? c.color + '40' : 'rgba(255,255,255,0.06)'}`, transition: 'all 0.15s' }}>{c.code}</button>
                    ))}
                  </div>
                  {selectedCourse?.materials?.length > 0 && <p style={{ fontSize: 10, color: GREEN, marginTop: 8, margin: '8px 0 0' }}>✓ {selectedCourse.materials.length} file{selectedCourse.materials.length !== 1 ? 's' : ''} from {selectedCourse.code} loaded</p>}
                </motion.div>
              )}

              {/* Topic */}
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, ease }}
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px' }}>
                <div style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.22em', fontFamily: 'monospace', marginBottom: 10 }}>TOPIC / EXAM NAME</div>
                <input type="text" value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && canGenerate && handleGenerate()}
                  placeholder="e.g., Midterm 2 — Cell Division, Final Exam, Chapter 7..."
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: 'white', padding: '10px 13px', fontSize: 13, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = `${BLUE}60`} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
              </motion.div>

              {/* Level + Exam Type side by side */}
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, ease }}
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px' }}>
                  <div style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.2em', fontFamily: 'monospace', marginBottom: 8 }}>LEVEL</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {[['highschool', 'High School'], ['undergraduate', 'Undergrad'], ['graduate', 'Graduate']].map(([v, l]) => (
                      <button key={v} onClick={() => setCourseLevel(v)} style={{ padding: '7px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, textAlign: 'left', cursor: 'pointer', background: courseLevel === v ? `linear-gradient(135deg,${BLUE},${CYAN})` : 'rgba(255,255,255,0.03)', color: courseLevel === v ? '#fff' : 'rgba(255,255,255,0.4)', border: courseLevel === v ? 'none' : '1px solid rgba(255,255,255,0.06)', transition: 'all 0.15s' }}>{l}</button>
                    ))}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px' }}>
                  <div style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.2em', fontFamily: 'monospace', marginBottom: 8 }}>EXAM TYPE</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {[['multiple-choice', 'MCQ'], ['short-answer', 'Short Answer'], ['essay', 'Essay'], ['mixed', 'Mixed']].map(([v, l]) => (
                      <button key={v} onClick={() => setExamType(v)} style={{ padding: '7px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, textAlign: 'left', cursor: 'pointer', background: examType === v ? `linear-gradient(135deg,${BLUE},${CYAN})` : 'rgba(255,255,255,0.03)', color: examType === v ? '#fff' : 'rgba(255,255,255,0.4)', border: examType === v ? 'none' : '1px solid rgba(255,255,255,0.06)', transition: 'all 0.15s' }}>{l}</button>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Focus areas */}
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25, ease }}
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px' }}>
                <div style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.22em', fontFamily: 'monospace', marginBottom: 10 }}>WHAT CONFUSES YOU <span style={{ color: 'rgba(255,255,255,0.14)', fontWeight: 400, fontSize: 9, letterSpacing: 0, textTransform: 'none' }}>optional</span></div>
                <textarea value={focusAreas} onChange={e => setFocusAreas(e.target.value)} rows={3}
                  placeholder="e.g., I don't understand entropy, or when to use integration by parts..."
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, color: '#fff', fontSize: 12, padding: '10px 13px', resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5, transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = `${BLUE}50`} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'} />
              </motion.div>

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Generate button */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, ease }}>
                {/* File summary */}
                {uploadedFiles.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    {uploadedFiles.some(f => f.extracting) && (
                      <div style={{ fontSize: 10, color: CYAN, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ width: 8, height: 8, border: `2px solid ${CYAN}`, borderTopColor: 'transparent', borderRadius: '50%' }} />
                        Extracting content...
                      </div>
                    )}
                    {!uploadedFiles.some(f => f.extracting) && (
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                        {uploadedFiles.filter(f => (f.content || '').length >= 400).length} of {uploadedFiles.length} files ready
                        {' · '}{Math.round(uploadedFiles.reduce((s, f) => s + (f.content || '').length, 0) / 1000)}k chars total
                      </div>
                    )}
                  </div>
                )}

                <motion.button
                  whileHover={canGenerate ? { scale: 1.02, boxShadow: `0 0 40px ${BLUE}50` } : {}}
                  whileTap={canGenerate ? { scale: 0.98 } : {}}
                  onClick={handleGenerate} disabled={!canGenerate}
                  style={{
                    width: '100%', padding: '18px 0', borderRadius: 14,
                    fontSize: 14, fontWeight: 900, letterSpacing: '0.08em',
                    background: canGenerate ? `linear-gradient(135deg,${BLUE},${CYAN})` : 'rgba(255,255,255,0.04)',
                    color: canGenerate ? '#fff' : 'rgba(255,255,255,0.15)',
                    border: 'none', cursor: canGenerate ? 'pointer' : 'not-allowed',
                    boxShadow: canGenerate ? `0 0 28px ${BLUE}35` : 'none',
                    transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                  }}>
                  {canGenerate && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)', animation: 'clutch-scan 3s linear infinite' }} />}
                  <span style={{ position: 'relative' }}>
                    {uploadedFiles.some(f => f.extracting) ? 'Waiting for extraction...' : uploadedFiles.length > 0 ? `LAUNCH CLUTCH — ${uploadedFiles.length} FILE${uploadedFiles.length !== 1 ? 'S' : ''} ⚡` : 'LAUNCH CLUTCH ⚡'}
                  </span>
                </motion.button>

                {/* Error display */}
                {generateError && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    style={{ marginTop: 10, padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>⚠️</span>
                    <div style={{ fontSize: 12, color: '#fca5a5', lineHeight: 1.5 }}>{generateError}</div>
                    <button onClick={() => setGenerateError(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 14, flexShrink: 0, padding: '0 2px' }}>✕</button>
                  </motion.div>
                )}

                {/* Past sessions */}
                {sessions.length > 0 && (
                  <button onClick={() => setSessionsOpen(true)} style={{ width: '100%', marginTop: 10, padding: '11px 0', borderRadius: 12, fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', letterSpacing: '0.04em' }}>
                    View {sessions.length} past session{sessions.length !== 1 ? 's' : ''} →
                  </button>
                )}
              </motion.div>
            </div>
          </div>
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
