/**
 * syllabusParser.js
 * Syllabus extraction + AI structuring via secure /api/groq proxy.
 * Falls back to regex extraction if AI unavailable.
 */
import { getAuthToken } from '../lib/supabase'

// ── Text extraction ────────────────────────────────────────────────────────────
export async function extractTextFromFile(file) {
  if (!file) throw new Error('No file provided')

  const ext = file.name.split('.').pop().toLowerCase()

  if (ext === 'pdf') {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
    const buffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
    let text = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      text += content.items.map(item => item.str).join(' ') + '\n'
    }
    return text
  }

  // txt, md, csv, etc.
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.onerror = () => reject(new Error('File read error'))
    reader.readAsText(file)
  })
}

// ── Groq AI parser ─────────────────────────────────────────────────────────────
// All AI calls go through the secure server proxy (/api/groq).
// The proxy uses GROQ_API_KEY from Vercel env vars (server-side only).
const PROXY_URL = '/api/groq'

const PROMPT = (text, courseName, courseCode) => `
You are an expert university syllabus parser. Extract EVERY piece of information from this syllabus and return a complete, structured JSON object.

Course name hint: ${courseName || 'Unknown'}
Course code hint: ${courseCode || 'Unknown'}

SYLLABUS TEXT:
"""
${text.slice(0, 14000)}
"""

Return ONLY a valid JSON object with this EXACT structure (use null for missing fields, empty arrays for missing lists):
{
  "courseInfo": {
    "professor": "Full professor name",
    "professorEmail": "email@university.edu",
    "officeHours": "e.g. Monday/Wednesday 2-4pm",
    "officeLocation": "e.g. Science Hall Room 204",
    "classTimes": "e.g. MWF 10:00-10:50am",
    "classLocation": "e.g. Anderson Hall 101",
    "textbook": "Title, Author (Edition)",
    "prerequisites": "e.g. MATH 201, CHEM 101"
  },
  "gradingBreakdown": [
    { "category": "Homework", "weight": 20, "description": "Weekly problem sets" },
    { "category": "Midterm Exam", "weight": 25, "description": "Covers Chapters 1-6" },
    { "category": "Final Exam", "weight": 35, "description": "Comprehensive" },
    { "category": "Participation", "weight": 10, "description": "In-class" },
    { "category": "Labs", "weight": 10, "description": "Lab reports" }
  ],
  "weeklySchedule": [
    {
      "week": 1,
      "dates": "Jan 13 - Jan 17",
      "topics": ["Course Introduction", "Overview of Key Concepts"],
      "readings": ["Chapter 1: pp. 1-24", "Supplemental reading on Canvas"],
      "due": ["Nothing due this week"]
    }
  ],
  "assignments": [
    {
      "title": "Problem Set 1",
      "type": "homework",
      "dueDate": "2026-02-10",
      "weight": 5,
      "description": "Problems from Chapter 2, exercises 1-20",
      "points": 100
    }
  ],
  "exams": [
    {
      "title": "Midterm Exam",
      "type": "exam",
      "dueDate": "2026-03-05",
      "weight": 25,
      "topics": ["Chapters 1-5", "Lab material from weeks 1-6"],
      "location": "Regular classroom",
      "description": "Closed book, 80 minutes"
    }
  ],
  "policies": {
    "lateWork": "Description of late work policy",
    "attendance": "Description of attendance policy",
    "grading": "Description of grading scale (A=93-100, etc.)",
    "academicIntegrity": "Academic integrity/plagiarism policy"
  },
  "importantDates": [
    { "date": "2026-02-10", "event": "Last day to drop without W" },
    { "date": "2026-03-15", "event": "Spring Break begins" }
  ]
}

Rules:
- Convert all dates to YYYY-MM-DD format. If year is unknown, use 2026.
- For assignment types use only: homework, quiz, exam, project, paper, lab, participation, other
- Extract EVERY assignment, quiz, exam, project mentioned
- Extract EVERY week's topics even if brief
- Be thorough — students depend on this data
`

export async function parseSyllabus(text, courseName, courseCode, onStep) {
  onStep?.('Reading course structure...')

  const token = await getAuthToken()
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: PROMPT(text, courseName, courseCode) }],
      response_format: { type: 'json_object' },
      temperature: 0.05,
      max_tokens: 4096,
    }),
  })

  if (res.status === 429) {
    const { error } = await res.json().catch(() => ({}))
    throw new Error(error || 'Daily AI limit reached. Try again tomorrow.')
  }

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}))
    throw new Error(error || `AI service error (${res.status})`)
  }

  onStep?.('Organizing assignments & deadlines...')
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty response from AI')

  const parsed = JSON.parse(content)
  return normalizeResult(parsed)
}

// ── Fallback: regex-based extraction ──────────────────────────────────────────
function parseSyllabusFallback(text, courseName, courseCode) {
  // Professor
  const profMatch = text.match(/(?:professor|instructor|prof\.?|taught by|faculty):?\s*([A-Z][a-zA-Z\-']+(?:\s+[A-Z][a-zA-Z\-']+){0,3})/i)
  const professor = profMatch?.[1]?.trim() || ''

  // Email
  const emailMatch = text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)
  const professorEmail = emailMatch?.[0] || ''

  // Office hours
  const ohMatch = text.match(/office hours?:?\s*([^\n.]+)/i)
  const officeHours = ohMatch?.[1]?.trim() || ''

  // Office location
  const olMatch = text.match(/office(?:\s+location)?:?\s*([^\n,]+(?:hall|room|building|office|rm\.?)[^\n,]*)/i)
  const officeLocation = olMatch?.[1]?.trim() || ''

  // Class times
  const ctMatch = text.match(/(?:class(?:es)?|lecture|meets?|scheduled?):?\s*((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[^\n]+)/i)
  const classTimes = ctMatch?.[1]?.trim() || ''

  // Textbook
  const tbMatch = text.match(/(?:textbook|required text|course text|book):?\s*([^\n]+)/i)
  const textbook = tbMatch?.[1]?.trim().slice(0, 120) || ''

  // Grading breakdown (look for percentages)
  const gradingBreakdown = []
  const gradingMatches = [...text.matchAll(/([A-Za-z][A-Za-z /&]+?)\s*[:\-–]?\s*(\d{1,3})\s*%/g)]
  for (const m of gradingMatches) {
    const w = parseInt(m[2])
    if (w > 0 && w <= 100 && m[1].length < 50) {
      gradingBreakdown.push({ category: m[1].trim(), weight: w, description: '' })
    }
  }

  // Assignments — look for date patterns near assignment-like words
  const assignments = []
  const duePat = /([A-Za-z][A-Za-z\s\-#0-9]+?)\s*(?:due|submitted?|turn(?:ed)? in|deadline):?\s*(?:by\s+)?(?:([A-Z][a-z]+\.?\s+\d{1,2}(?:,?\s+\d{4})?))/gi
  for (const m of text.matchAll(duePat)) {
    const title = m[1].trim()
    if (title.length < 80 && assignments.length < 25) {
      const type = /exam|test|midterm|final/i.test(title) ? 'exam'
        : /quiz/i.test(title) ? 'quiz'
        : /project/i.test(title) ? 'project'
        : /paper|essay|report/i.test(title) ? 'paper'
        : /lab/i.test(title) ? 'lab'
        : 'homework'
      assignments.push({ title, type, dueDate: null, weight: 0, description: m[0].trim(), points: null })
    }
  }

  // Late policy
  const lateMatch = text.match(/late (?:work|assignment|submission|polic)[^\n.]+(?:\.[^\n]+)?/i)
  const lateWork = lateMatch?.[0]?.trim() || ''

  // Attendance policy
  const attMatch = text.match(/attendance[^\n.]+(?:\.[^\n]+)?/i)
  const attendance = attMatch?.[0]?.trim() || ''

  // Grading scale
  const gradeScaleMatch = text.match(/(?:grading scale|grade scale|grades?)[^\n:]*:?([^\n]+(?:\n[^\n]+){0,4})/i)
  const grading = gradeScaleMatch?.[1]?.trim() || ''

  return normalizeResult({
    courseInfo: { professor, professorEmail, officeHours, officeLocation, classTimes, classLocation: '', textbook, prerequisites: '' },
    gradingBreakdown,
    weeklySchedule: [],
    assignments,
    exams: assignments.filter(a => a.type === 'exam'),
    policies: { lateWork, attendance, grading, academicIntegrity: '' },
    importantDates: [],
  })
}

// ── Normalize + merge assignments/exams ───────────────────────────────────────
function normalizeResult(raw) {
  const allAssignments = [
    ...(raw.assignments || []),
    ...(raw.exams || []),
  ].filter(a => a && a.title)

  // Deduplicate by title
  const seen = new Set()
  const dedupedAssignments = allAssignments.filter(a => {
    const key = a.title.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Sort by due date
  dedupedAssignments.sort((a, b) => {
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return new Date(a.dueDate) - new Date(b.dueDate)
  })

  return {
    courseInfo: raw.courseInfo || {},
    gradingBreakdown: (raw.gradingBreakdown || []).filter(g => g.weight > 0),
    weeklySchedule: raw.weeklySchedule || [],
    assignments: dedupedAssignments,
    policies: raw.policies || {},
    importantDates: raw.importantDates || [],
    parsedAt: new Date().toISOString(),
  }
}

// ── Convert parsed data to deadline entries ───────────────────────────────────
export function syllabusToDeadlines(syllabusData, courseId, courseName, courseCode, courseColor) {
  const deadlines = []
  for (const a of syllabusData.assignments || []) {
    if (!a.dueDate) continue
    const d = new Date(a.dueDate)
    if (isNaN(d.getTime())) continue
    deadlines.push({
      id: crypto.randomUUID(),
      title: a.title,
      type: a.type || 'assignment',
      date: a.dueDate,
      courseId,
      course: courseName,
      courseColor,
      weight: a.weight || 5,
      difficulty: a.type === 'exam' ? 8 : a.type === 'project' ? 7 : 5,
      completed: false,
      fromSyllabus: true,
    })
  }
  return deadlines
}
