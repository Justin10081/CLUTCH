import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useCourses } from '../context/CoursesContext'
import { useSessions } from '../context/SessionsContext'
import { getAuthToken } from '../lib/supabase'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

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
      'Know the step-by-step mechanism for every major process covered',
      'Learn exceptions and edge cases for every major rule',
      hasFiles ? `From ${fileNames}: extract all bolded terms, numbered lists, and italicized definitions` : 'Review all bolded terms and numbered lists in your notes',
      'Any diagram or figure introduced = know every labeled component',
      'Any formula or equation = know when to use it, what variables mean, units',
    ],
    diagrams: [],
    stepByStep: [],
    codeExamples: [],
    formulas: [],
    workedExamples: [],
    likelyQuestions: [
      { question: `Define the core concepts of ${topic} and explain how they relate to each other`, answer: `Use precise definitions. Explain the relationships: how does concept A lead to or affect concept B? Use specific terminology and at least one concrete example.`, howToStructure: 'Define → Explain relationship → Give concrete example → State significance' },
      { question: `Explain the main mechanism or process in ${topic} step by step`, answer: `Walk through each stage in order. Name the inputs, what happens at each step, and the outputs.`, howToStructure: 'State the process → List numbered steps → Explain each → State outcome' },
    ],
    misconceptions: [
      { myth: 'Memorizing definitions is sufficient preparation', reality: 'Exams test application and causal reasoning. You must explain HOW and WHY, not just WHAT.', whyPeopleBelieveIt: 'Definitions feel concrete and checkable, so students stop there without testing deeper understanding.' },
      { myth: 'Understanding in class = able to reproduce on an exam', reality: "Comprehension and recall are different skills. Test yourself: close your notes and write out each concept.", whyPeopleBelieveIt: 'Passive re-reading creates familiarity that feels like knowledge but isn\'t retrieval practice.' },
    ],
    flashcards: [
      { front: `What is the central definition of the main concept in ${topic}?`, back: 'State the precise definition with all qualifying conditions.' },
      { front: `What causes the primary process in ${topic}?`, back: 'Inputs, triggers, and preconditions — be specific.' },
    ],
    summary: `${topic} — focus on: precise definitions, causal mechanisms, cause-effect chains, and exceptions.`,
  }
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const BG = '#080a0e'
const BLUE = '#3b82f6'
const CYAN = '#06b6d4'
const VIOLET = '#8b5cf6'
const AMBER = '#f59e0b'
const RED = '#ef4444'
const GREEN = '#34d399'
const ease = [0.16, 1, 0.3, 1]
const CONCEPT_ACCENTS = [BLUE, CYAN, VIOLET, AMBER, GREEN, '#f43f5e', '#ec4899', '#10b981']
const LOADING_STEPS = ['Reading your materials...', 'Detecting subject type...', 'Building adaptive guide...', 'Finalizing content...']

// ─── ScanSection ──────────────────────────────────────────────────────────────
function ScanSection({ scene, title, accent = BLUE, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.55, ease, delay }}
      style={{ marginBottom: 48 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{ fontSize: 9, fontWeight: 900, color: accent, letterSpacing: '0.18em', padding: '4px 10px', border: `1px solid ${accent}40`, borderRadius: 4, fontFamily: 'ui-monospace, monospace', flexShrink: 0, background: `${accent}08` }}>{scene}</div>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${accent}35, transparent)` }} />
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{title}</div>
      </div>
      {children}
    </motion.div>
  )
}

// ─── ConceptCard (enhanced with teacher depth) ────────────────────────────────
function ConceptCard({ concept, index }) {
  const [open, setOpen] = useState(false)
  const accent = CONCEPT_ACCENTS[index % CONCEPT_ACCENTS.length]
  const text = concept.explanation || concept.definition || ''
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ delay: index * 0.05, ease }}
      whileHover={!open ? { y: -3 } : {}}
      onClick={() => setOpen(o => !o)}
      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.07)`, borderTop: `2px solid ${accent}`, borderRadius: 14, padding: '20px', cursor: 'pointer', transition: 'box-shadow 0.25s', boxShadow: open ? `0 0 0 1px ${accent}30, 0 8px 32px ${accent}10` : 'none' }}>
      <div style={{ fontSize: 9, fontWeight: 900, color: `${accent}70`, letterSpacing: '0.22em', fontFamily: 'monospace', marginBottom: 10 }}>CONCEPT {String(index + 1).padStart(2, '0')}</div>
      <div style={{ fontSize: 15, fontWeight: 900, color: 'white', letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 10 }}>{concept.term || concept.title}</div>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: 0 }}>{open ? text : text.slice(0, 120) + (text.length > 120 ? '…' : '')}</p>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.28 }} style={{ overflow: 'hidden' }}>
            {concept.example && (
              <div style={{ marginTop: 14, padding: '12px 14px', background: `${accent}09`, border: `1px solid ${accent}20`, borderRadius: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 900, color: `${accent}70`, letterSpacing: '0.18em', fontFamily: 'monospace', marginBottom: 6 }}>EXAMPLE</div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontStyle: 'italic', lineHeight: 1.7, margin: 0 }}>{concept.example}</p>
              </div>
            )}
            {concept.whyItMatters && (
              <div style={{ marginTop: 8, padding: '12px 14px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.14)', borderRadius: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 900, color: `${BLUE}70`, letterSpacing: '0.18em', fontFamily: 'monospace', marginBottom: 6 }}>WHY IT MATTERS</div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: 0 }}>{concept.whyItMatters}</p>
              </div>
            )}
            {concept.commonMistake && (
              <div style={{ marginTop: 8, padding: '12px 14px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 900, color: `${RED}70`, letterSpacing: '0.18em', fontFamily: 'monospace', marginBottom: 6 }}>⚠ COMMON MISTAKE</div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: 0 }}>{concept.commonMistake}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ marginTop: 12, fontSize: 9, fontWeight: 800, color: `${accent}50`, letterSpacing: '0.15em', fontFamily: 'monospace' }}>{open ? '▲ COLLAPSE' : '▼ EXPAND'}</div>
    </motion.div>
  )
}

// ─── TeacherNote ──────────────────────────────────────────────────────────────
function TeacherNote({ note, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -14 }} whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }} transition={{ delay: index * 0.07, ease }}
      style={{ display: 'flex', gap: 14, padding: '16px 18px', background: `${AMBER}07`, border: `1px solid ${AMBER}20`, borderLeft: `3px solid ${AMBER}`, borderRadius: 12, marginBottom: 10 }}>
      <div style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>💡</div>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.75, margin: 0 }}>{note}</p>
    </motion.div>
  )
}

// ─── DiagramBlock ─────────────────────────────────────────────────────────────
function DiagramBlock({ diagram, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ delay: index * 0.08, ease }}
      style={{ background: '#04060a', border: `1px solid ${CYAN}22`, borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ background: `${CYAN}08`, borderBottom: `1px solid ${CYAN}15`, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 9, fontWeight: 900, color: CYAN, letterSpacing: '0.18em', fontFamily: 'monospace' }}>DIAGRAM {String(index + 1).padStart(2, '0')}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{diagram.title}</span>
      </div>
      {diagram.description && (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, margin: '12px 18px 0', fontStyle: 'italic' }}>{diagram.description}</p>
      )}
      {diagram.ascii && (
        <pre style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: 'rgba(255,255,255,0.72)', lineHeight: 1.75, padding: '16px 18px', margin: 0, overflowX: 'auto', whiteSpace: 'pre' }}>{diagram.ascii}</pre>
      )}
    </motion.div>
  )
}

// ─── StepBlock ────────────────────────────────────────────────────────────────
function StepBlock({ item, index }) {
  const [open, setOpen] = useState(index === 0)
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ delay: index * 0.07, ease }}
      style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${GREEN}18`, borderRadius: 14, overflow: 'hidden', marginBottom: 10 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', textAlign: 'left', padding: '14px 18px', background: open ? `${GREEN}06` : 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${GREEN}15`, border: `1px solid ${GREEN}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: GREEN, fontFamily: 'monospace' }}>{String(index + 1).padStart(2, '0')}</span>
        </div>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 800, color: 'white' }}>{item.title}</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2.5} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s', flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: 'hidden' }}>
            {item.context && (
              <p style={{ fontSize: 12, color: `${GREEN}90`, lineHeight: 1.65, margin: '0 18px 12px', fontStyle: 'italic' }}>{item.context}</p>
            )}
            <div style={{ padding: '0 18px 16px' }}>
              {(item.steps || []).map((step, si) => (
                <div key={si} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: `${GREEN}12`, border: `1px solid ${GREEN}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: GREEN, fontFamily: 'monospace' }}>{si + 1}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, margin: 0 }}>{step}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── CodeBlock ────────────────────────────────────────────────────────────────
function CodeBlock({ example, index }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(example.code || '').then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) })
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ delay: index * 0.08, ease }}
      style={{ background: '#04060a', border: `1px solid ${VIOLET}22`, borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ background: `${VIOLET}08`, borderBottom: `1px solid ${VIOLET}15`, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: RED }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: AMBER }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: GREEN }} />
        <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 900, color: `${VIOLET}80`, letterSpacing: '0.18em', fontFamily: 'monospace', flex: 1 }}>{(example.language || 'CODE').toUpperCase()} — {example.title}</span>
        <button onClick={copy} style={{ fontSize: 10, fontWeight: 700, color: copied ? GREEN : 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.05em' }}>{copied ? '✓ COPIED' : 'COPY'}</button>
      </div>
      <pre style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5, color: 'rgba(255,255,255,0.82)', lineHeight: 1.75, padding: '18px', margin: 0, overflowX: 'auto', whiteSpace: 'pre' }}>{example.code}</pre>
      {example.explanation && (
        <div style={{ padding: '14px 18px', borderTop: `1px solid ${VIOLET}12`, background: `${VIOLET}04` }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: `${VIOLET}60`, letterSpacing: '0.18em', fontFamily: 'monospace', marginBottom: 8 }}>EXPLANATION</div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: 0 }}>{example.explanation}</p>
        </div>
      )}
    </motion.div>
  )
}

// ─── WorkedExample (enhanced) ─────────────────────────────────────────────────
function WorkedExample({ ex, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ delay: index * 0.08 }}
      style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${CYAN}18`, marginBottom: 14 }}>
      <div style={{ background: `${CYAN}07`, padding: '14px 18px', borderBottom: `1px solid ${CYAN}12`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 9, fontWeight: 900, color: `${CYAN}70`, fontFamily: 'monospace', letterSpacing: '0.18em', flexShrink: 0 }}>EXAMPLE {String(index + 1).padStart(2, '0')}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1.4 }}>{ex.problem || ex.title}</span>
      </div>
      {ex.approach && (
        <div style={{ padding: '12px 18px', background: `${AMBER}05`, borderBottom: `1px solid ${AMBER}10` }}>
          <span style={{ fontSize: 9, fontWeight: 900, color: `${AMBER}70`, fontFamily: 'monospace', letterSpacing: '0.15em' }}>APPROACH — </span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic' }}>{ex.approach}</span>
        </div>
      )}
      <div style={{ padding: '18px', background: 'rgba(0,0,0,0.25)' }}>
        <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.2em', color: `${CYAN}40`, fontFamily: 'monospace', marginBottom: 12 }}>STEP-BY-STEP SOLUTION</div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.95, whiteSpace: 'pre-line', fontFamily: 'ui-monospace, monospace', margin: 0 }}>{ex.solution || ex.steps}</p>
      </div>
      {ex.keyInsight && (
        <div style={{ padding: '14px 18px', borderTop: `1px solid rgba(255,255,255,0.05)`, background: `${GREEN}04`, display: 'flex', gap: 10 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>🔑</span>
          <div>
            <div style={{ fontSize: 9, fontWeight: 900, color: `${GREEN}70`, letterSpacing: '0.18em', fontFamily: 'monospace', marginBottom: 5 }}>KEY INSIGHT</div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.65, margin: 0 }}>{ex.keyInsight}</p>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ─── ExamQuestionCard (with howToStructure) ────────────────────────────────────
function ExamQuestionCard({ question, index }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }} transition={{ delay: index * 0.06, ease }}
      style={{ borderRadius: 12, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: open ? 'rgba(244,63,94,0.07)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: `3px solid ${open ? RED : 'rgba(244,63,94,0.4)'}`, borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s' }}>
        <div style={{ flexShrink: 0, textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: RED, letterSpacing: '0.1em', fontFamily: 'monospace' }}>Q</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: RED, fontFamily: 'monospace', lineHeight: 1 }}>{String(index + 1).padStart(2, '0')}</div>
        </div>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{question.question}</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={2.5} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s', flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '18px 18px 18px 62px', background: 'rgba(244,63,94,0.04)', borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', color: 'rgba(244,63,94,0.5)', fontFamily: 'monospace', marginBottom: 10 }}>MODEL ANSWER</div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.85, margin: 0, whiteSpace: 'pre-line' }}>{question.answer}</p>
              {question.howToStructure && (
                <div style={{ marginTop: 14, padding: '10px 14px', background: `${BLUE}08`, border: `1px solid ${BLUE}18`, borderRadius: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 900, color: `${BLUE}70`, letterSpacing: '0.15em', fontFamily: 'monospace' }}>HOW TO STRUCTURE — </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>{question.howToStructure}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── LoadingRing ──────────────────────────────────────────────────────────────
function LoadingRing({ size, color, duration, reverse = false, offset = 0 }) {
  return (
    <>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes spin-r{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}`}</style>
      <div style={{ position: 'absolute', top: offset, left: offset, right: offset, bottom: offset, width: size - offset * 2, height: size - offset * 2, borderRadius: '50%', border: `2px solid transparent`, borderTopColor: color, borderRightColor: `${color}33`, animation: `${reverse ? 'spin-r' : 'spin'} ${duration}s linear infinite` }} />
    </>
  )
}

// ─── QuizCard ─────────────────────────────────────────────────────────────────
function QuizCard({ question, index, total, showAnswer, onReveal, onGrade }) {
  const pct = Math.round((index / total) * 100)
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: BLUE, fontWeight: 700 }}>Question {index + 1} / {total}</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{pct}%</span>
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${BLUE},${CYAN})`, borderRadius: 2, transition: 'width 0.4s ease' }} />
        </div>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px', marginBottom: 14 }}>
        <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.6, margin: 0 }}>{question.question}</p>
      </div>
      {!showAnswer ? (
        <button onClick={onReveal} style={{ width: '100%', padding: '12px 0', borderRadius: 10, fontSize: 13, fontWeight: 800, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', letterSpacing: '0.05em' }}>Reveal Answer</button>
      ) : (
        <div>
          <div style={{ padding: '14px 16px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 10, marginBottom: 14 }}>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 1.7, margin: 0 }}>{question.answer}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['got', GREEN, '✓ Got it'], ['almost', AMBER, '~ Almost'], ['missed', RED, '✕ Missed']].map(([g, c, label]) => (
              <button key={g} onClick={() => onGrade(g)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 12, fontWeight: 800, background: `${c}14`, color: c, border: `1px solid ${c}30`, cursor: 'pointer' }}>{label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── QuizResults ─────────────────────────────────────────────────────────────
function QuizResults({ answers, onRetry }) {
  const got = answers.filter(a => a === 'got').length
  const almost = answers.filter(a => a === 'almost').length
  const missed = answers.filter(a => a === 'missed').length
  const score = Math.round(((got + almost * 0.5) / answers.length) * 100)
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: 48, fontWeight: 900, color: score >= 80 ? GREEN : score >= 60 ? AMBER : RED, letterSpacing: '-0.04em', marginBottom: 8 }}>{score}%</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
        <span style={{ fontSize: 12, color: GREEN }}>✓ {got} correct</span>
        <span style={{ fontSize: 12, color: AMBER }}>~ {almost} close</span>
        <span style={{ fontSize: 12, color: RED }}>✕ {missed} missed</span>
      </div>
      <button onClick={onRetry} style={{ padding: '10px 24px', borderRadius: 10, fontSize: 12, fontWeight: 800, background: `linear-gradient(135deg,${BLUE},${CYAN})`, color: '#fff', border: 'none', cursor: 'pointer' }}>Retry Quiz</button>
    </div>
  )
}

// ─── FlashcardOverlay ────────────────────────────────────────────────────────
function FlashcardOverlay({ concepts, order, index, flipped, onFlip, onPrev, onNext, onShuffle, onClose }) {
  const c = concepts[order[index]]
  if (!c) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ position: 'absolute', top: 24, right: 24 }}>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 16px', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✕ Close</button>
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 24, letterSpacing: '0.15em' }}>{index + 1} / {order.length}</div>
      <AnimatePresence mode="wait">
        <motion.div key={`${index}-${flipped}`} initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: -90, opacity: 0 }} transition={{ duration: 0.3 }} onClick={onFlip}
          style={{ width: '100%', maxWidth: 560, minHeight: 260, background: flipped ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.04)', border: flipped ? '1px solid rgba(59,130,246,0.25)' : '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '40px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', color: flipped ? BLUE : 'rgba(255,255,255,0.25)', marginBottom: 20, textTransform: 'uppercase' }}>{flipped ? 'BACK — Explanation' : 'FRONT — Term'}</div>
          <p style={{ fontSize: flipped ? 14 : 20, fontWeight: flipped ? 400 : 900, color: 'white', lineHeight: flipped ? 1.7 : 1.2, margin: 0, letterSpacing: flipped ? 0 : '-0.02em' }}>{flipped ? (c.explanation || c.definition) : (c.term || c.title)}</p>
          {flipped && c.example && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 16, fontStyle: 'italic', lineHeight: 1.6 }}>↳ {c.example}</p>}
          <div style={{ marginTop: 24, fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>TAP TO FLIP</div>
        </motion.div>
      </AnimatePresence>
      <div style={{ display: 'flex', gap: 12, marginTop: 28, alignItems: 'center' }}>
        <button onClick={onPrev} disabled={index === 0} style={{ padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: index === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)', cursor: index === 0 ? 'default' : 'pointer' }}>←</button>
        <button onClick={onShuffle} style={{ padding: '10px 20px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>Shuffle</button>
        <button onClick={onNext} disabled={index === order.length - 1} style={{ padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: index === order.length - 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)', cursor: index === order.length - 1 ? 'default' : 'pointer' }}>→</button>
      </div>
    </div>
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
  const [quizActive, setQuizActive] = useState(false)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState([])
  const [showQuizAnswer, setShowQuizAnswer] = useState(false)
  const [quizFinished, setQuizFinished] = useState(false)
  const [flashcardActive, setFlashcardActive] = useState(false)
  const [flashcardIndex, setFlashcardIndex] = useState(0)
  const [flashcardFlipped, setFlashcardFlipped] = useState(false)
  const [flashcardOrder, setFlashcardOrder] = useState([])
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

  useEffect(() => {
    if (result?.coreConcepts?.length > 0) setFlashcardOrder(result.coreConcepts.map((_, i) => i))
  }, [result])

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
      const prompt = `You are a brilliant, dedicated university professor who genuinely wants students to deeply understand this material — not just pass the test. Teach with the depth and clarity of someone who loves the subject.

TOPIC: "${effectiveTopic}"
${courseCtx ? `COURSE: ${courseCtx.name} (${courseCtx.code || ''})${courseCtx.professor ? ` — Prof. ${courseCtx.professor}` : ''}` : ''}
EXAM TYPE: ${examType || 'mixed'} | LEVEL: ${courseLevel || 'undergraduate'}
${focusAreas ? `STUDENT STRUGGLES WITH: ${focusAreas}` : ''}
${fileContext ? `\nUPLOADED MATERIALS (use these as your primary source):\n${fileContext.slice(0, 12000)}` : ''}

STEP 1 — Detect content type:
- "technical": math, CS, programming, physics, chemistry, engineering, statistics, economics with equations
- "conceptual": history, philosophy, descriptive biology, psychology, literature, law, political science, sociology, art
- "mixed": business, general science, economics without heavy math

STEP 2 — Generate maximally useful study content. Return ONLY valid JSON:
{
  "contentType": "technical|conceptual|mixed",
  "plainEnglish": "5-6 flowing paragraphs. Tell the STORY of this subject. Use vivid real-world analogies. Explain the BIG PICTURE first, then how the pieces connect. Write like you're explaining to a smart friend over coffee — conversational, specific, insightful. No bullet points.",
  "teacherNotes": ["3-5 strings: professor-level insights students typically miss. The 'by the way' moments that make things click. Deeper connections, exam traps, why something works the way it does. Be specific to this exact material."],
  "coreConcepts": [{"term": "string", "explanation": "string — thorough, specific content explanation (3-5 sentences). Explain the mechanism, not just the definition.", "whyItMatters": "string — why does this concept matter? What breaks if you don't understand it?", "commonMistake": "string — the specific wrong way students think about this", "example": "string — vivid, concrete, specific example"}],
  "cheatSheet": ["12-20 specific facts, rules, definitions, relationships — directly from the material"],
  "diagrams": [{"title": "string", "description": "string — what this diagram shows and why it helps", "ascii": "string — ASCII art diagram: process flows, relationship maps, hierarchies, timelines, comparison tables. Use spaces, arrows (→, ←, ↓, ↑), boxes made of dashes/pipes, and labels. Make it genuinely useful and clear."}],
  "stepByStep": [{"title": "string — name of the algorithm/procedure/process", "context": "string — when to use this and why", "steps": ["string — numbered step with explanation of WHAT you do AND WHY"]}],
  "codeExamples": [{"language": "string", "title": "string", "code": "string — actual runnable code", "explanation": "string — line-by-line or block-by-block explanation"}],
  "formulas": [{"name": "string", "formula": "string", "whenToUse": "string — specific conditions", "variables": "string — each variable defined with units", "derivation": "string — brief intuition for WHY this formula works"}],
  "workedExamples": [{"problem": "string", "approach": "string — hint about strategy before solving", "solution": "string — full step-by-step with reasoning at each step. Format as: Step 1: ... (reason). Step 2: ...", "keyInsight": "string — the key conceptual insight this problem teaches"}],
  "likelyQuestions": [{"question": "string", "answer": "string — thorough model answer with actual content, showing exactly how to respond on an exam", "howToStructure": "string — e.g., Define → Apply → Conclude, or State → Prove → Example"}],
  "misconceptions": [{"myth": "string", "reality": "string", "whyPeopleBelieveIt": "string — the psychological/logical reason this misconception is so common"}],
  "flashcards": [{"front": "string", "back": "string"}],
  "summary": "string"
}

CONTENT TYPE RULES (adapt your output):
FOR TECHNICAL: generate 4-6 workedExamples with full step-by-step reasoning. Populate stepByStep with algorithms and procedures. Include codeExamples if CS/programming. Fewer diagrams, more formulas.
FOR CONCEPTUAL: write richer plainEnglish (5-6 paragraphs with narrative). Generate 3-5 ASCII diagrams showing processes, relationships, timelines, or hierarchies. Deep coreConcepts with cause-effect. No formulas, no code.
FOR MIXED: balance all sections. Include some diagrams and some examples.

QUALITY RULES:
- Extract content DIRECTLY from uploaded materials when available. Quote specific details.
- coreConcepts: 6-10 deep explanations — not just definitions, teach the mechanism
- cheatSheet: specific facts from the ACTUAL subject, not generic study tips
- diagrams: [] if technical; 3-5 useful ASCII visuals if conceptual
- stepByStep: [] if conceptual; 2-4 procedures if technical
- codeExamples: [] unless CS/programming content present
- workedExamples: [] if conceptual; 4-6 if technical
- likelyQuestions: 7-10 with thorough answers showing HOW to write exam responses
- misconceptions: 5-7 specific to this exact subject with psychological explanation
- Every answer should model the depth expected at ${courseLevel || 'undergraduate'} level`

      const token = await getAuthToken()
      const res = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.25, max_tokens: 6000 }),
      })
      setLoadingStep(2)
      if (res.status === 429) { const { error } = await res.json().catch(() => ({})); setStep('input'); alert(error || 'Daily AI limit reached. Resets at midnight.'); return }
      if (res.ok) { const json = await res.json(); data = JSON.parse(json.choices[0].message.content); setLoadingStep(3) }
    } catch (e) { console.warn('Groq error, using fallback:', e) }

    if (!data) { await new Promise(r => setTimeout(r, 1800)); data = generateFallback(effectiveTopic, uploadedFiles) }
    setResult(data); setStep('result'); setSessionSaved(false)
    addSession({ courseId, courseName, topic: topic || selectedCourse?.name || 'Your Course', filesUsed: uploadedFiles.map(f => f.name), result: data })
    setSessionSaved(true)
    setQuizActive(false); setQuizIndex(0); setQuizAnswers([]); setShowQuizAnswer(false); setQuizFinished(false)
    setFlashcardActive(false); setFlashcardIndex(0); setFlashcardFlipped(false)
  }

  const resetAll = () => {
    setStep('input'); setResult(null)
    setTopic(''); setFocusAreas('')
    setQuizActive(false); setQuizFinished(false); setQuizAnswers([])
    setFlashcardActive(false); setSessionSaved(false)
  }

  const restoreSession = (session) => {
    setResult(session.result); setStep('result')
    setSelectedCourseId(session.courseId || ''); setTopic(session.topic || '')
    setSessionSaved(true); setSessionsOpen(false)
    setQuizActive(false); setQuizFinished(false); setQuizAnswers([])
    setFlashcardActive(false)
  }

  const startQuiz = () => { setQuizActive(true); setQuizIndex(0); setQuizAnswers([]); setShowQuizAnswer(false); setQuizFinished(false) }
  const answerQuiz = (grade) => {
    const newAnswers = [...quizAnswers, grade]
    setQuizAnswers(newAnswers)
    if (quizIndex + 1 >= (result?.likelyQuestions || []).length) { setQuizFinished(true) }
    else { setQuizIndex(quizIndex + 1); setShowQuizAnswer(false) }
  }
  const openFlashcards = () => { setFlashcardActive(true); setFlashcardIndex(0); setFlashcardFlipped(false); setFlashcardOrder((result?.coreConcepts || []).map((_, i) => i)) }
  const shuffleFlashcards = () => {
    const arr = [...flashcardOrder]
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]] }
    setFlashcardOrder(arr); setFlashcardIndex(0); setFlashcardFlipped(false)
  }

  const canGenerate = topic.trim() || uploadedFiles.length > 0 || selectedCourseId
  const fileIcon = (type = '', name = '') => {
    if (type.includes('pdf') || name.endsWith('.pdf')) return '📄'
    if (name.endsWith('.pptx') || name.endsWith('.ppt')) return '📊'
    if (name.endsWith('.docx') || name.endsWith('.doc')) return '📝'
    return '📋'
  }

  const misconceptionsList = result?.misconceptions || result?.commonMisconceptions || result?.commonMistakes || []
  const ct = result?.contentType || 'mixed'

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: BG, minHeight: '100vh', color: '#fff', fontFamily: 'inherit', position: 'relative' }}>
      <style>{`
        @keyframes clutch-pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes clutch-scan { 0%{transform:translateX(-100%)} 100%{transform:translateX(400%)} }
        @keyframes clutch-blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>

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

      {/* Flashcard overlay */}
      {flashcardActive && result?.coreConcepts?.length > 0 && (
        <FlashcardOverlay concepts={result.coreConcepts} order={flashcardOrder} index={flashcardIndex} flipped={flashcardFlipped}
          onFlip={() => setFlashcardFlipped(f => !f)}
          onPrev={() => { setFlashcardIndex(i => Math.max(0, i - 1)); setFlashcardFlipped(false) }}
          onNext={() => { setFlashcardIndex(i => Math.min(flashcardOrder.length - 1, i + 1)); setFlashcardFlipped(false) }}
          onShuffle={shuffleFlashcards} onClose={() => setFlashcardActive(false)} />
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} style={{ marginBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 900, color: GREEN, letterSpacing: '0.22em', fontFamily: 'monospace' }}>SESSION COMPLETE</div>
              {ct !== 'mixed' && (
                <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.15em', padding: '3px 9px', borderRadius: 4, fontFamily: 'monospace', background: ct === 'technical' ? `${AMBER}12` : `${VIOLET}12`, color: ct === 'technical' ? AMBER : VIOLET, border: `1px solid ${ct === 'technical' ? AMBER : VIOLET}30` }}>
                  {ct === 'technical' ? '⚙ TECHNICAL' : '📖 CONCEPTUAL'}
                </div>
              )}
            </div>
            <h1 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 900, letterSpacing: '-0.04em', color: 'white', margin: '0 0 10px' }}>{topic || courseName || 'Your Study Guide'}</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              {[
                [result.coreConcepts?.length || 0, 'Concepts', BLUE],
                [result.cheatSheet?.length || 0, 'Key Facts', CYAN],
                [result.likelyQuestions?.length || 0, 'Exam Qs', RED],
                [result.flashcards?.length || 0, 'Flashcards', VIOLET],
                ...(result.formulas?.length > 0 ? [[result.formulas.length, 'Formulas', AMBER]] : []),
                ...(result.diagrams?.length > 0 ? [[result.diagrams.length, 'Diagrams', CYAN]] : []),
                ...(result.stepByStep?.length > 0 ? [[result.stepByStep.length, 'Procedures', GREEN]] : []),
                ...(result.codeExamples?.length > 0 ? [[result.codeExamples.length, 'Code', VIOLET]] : []),
              ].map(([count, label, color]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: `${color}10`, border: `1px solid ${color}30` }}>
                  <span style={{ fontSize: 13, fontWeight: 900, color, fontFamily: 'monospace' }}>{count}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em' }}>{label}</span>
                </div>
              ))}
              {uploadedFiles.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: `${GREEN}08`, border: `1px solid ${GREEN}20` }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: GREEN }}>✓ {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} analyzed</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* SCENE 00 · DECODE — In Other Words */}
          {result.plainEnglish && (
            <ScanSection scene="00 · DECODE" title="In Other Words" accent={VIOLET}>
              <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 20, padding: '32px 36px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, left: 18, fontSize: 140, color: 'rgba(139,92,246,0.07)', fontFamily: 'Georgia, serif', lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>"</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg,${VIOLET},${BLUE})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>⚡</div>
                  <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.22em', color: VIOLET, fontFamily: 'monospace' }}>AI TUTOR — PLAIN ENGLISH</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(139,92,246,0.15)' }} />
                </div>
                {result.plainEnglish.split('\n').filter(p => p.trim()).map((para, i, arr) => (
                  <motion.p key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, ease }}
                    style={{ fontSize: 15, lineHeight: 1.95, color: 'rgba(255,255,255,0.82)', fontWeight: 400, margin: 0, marginBottom: i < arr.length - 1 ? 22 : 0 }}>
                    {para}
                  </motion.p>
                ))}
              </div>
            </ScanSection>
          )}

          {/* SCENE 01 · DATA — Cheat Sheet */}
          {result.cheatSheet?.length > 0 && (
            <ScanSection scene="01 · DATA" title="Cheat Sheet" accent={CYAN}>
              <div style={{ background: '#04060a', border: `1px solid ${CYAN}25`, borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ background: `${CYAN}07`, borderBottom: `1px solid ${CYAN}18`, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: AMBER }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: GREEN }} />
                  <span style={{ marginLeft: 10, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', color: `${CYAN}70`, fontFamily: 'monospace' }}>CLUTCH.BRIEF — {result.cheatSheet.length} ITEMS</span>
                </div>
                <div style={{ padding: '16px 18px' }}>
                  {result.cheatSheet.map((fact, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03, ease }}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '9px 0', borderBottom: i < result.cheatSheet.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: CYAN, flexShrink: 0, marginTop: 2, minWidth: 32 }}>{'>'} {String(i + 1).padStart(2, '0')}</span>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 1.65 }}>{fact}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </ScanSection>
          )}

          {/* SCENE 02 · INSIGHT — Teacher's Notes */}
          {result.teacherNotes?.length > 0 && (
            <ScanSection scene="02 · INSIGHT" title="Teacher's Notes" accent={AMBER}>
              <div>
                {result.teacherNotes.map((note, i) => <TeacherNote key={i} note={note} index={i} />)}
              </div>
            </ScanSection>
          )}

          {/* SCENE 03 · CORE — Core Concepts */}
          {(result.coreConcepts?.length > 0 || result.keyConcepts?.length > 0) && (
            <ScanSection scene="03 · CORE" title="Core Concepts" accent={BLUE}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {(result.coreConcepts || result.keyConcepts || []).map((concept, i) => (
                  <ConceptCard key={i} concept={concept} index={i} />
                ))}
              </div>
            </ScanSection>
          )}

          {/* SCENE 04 · VISUAL — Diagrams (conceptual/mixed) */}
          {result.diagrams?.length > 0 && (
            <ScanSection scene="04 · VISUAL" title="Diagrams & Visual Aids" accent={CYAN}>
              <div>
                {result.diagrams.map((d, i) => <DiagramBlock key={i} diagram={d} index={i} />)}
              </div>
            </ScanSection>
          )}

          {/* SCENE 04 · STEPS — Step-by-Step (technical) */}
          {result.stepByStep?.length > 0 && (
            <ScanSection scene="04 · STEPS" title="Step-by-Step Procedures" accent={GREEN}>
              <div>
                {result.stepByStep.map((item, i) => <StepBlock key={i} item={item} index={i} />)}
              </div>
            </ScanSection>
          )}

          {/* SCENE 04 · CODE — Code Examples (CS) */}
          {result.codeExamples?.length > 0 && (
            <ScanSection scene="04 · CODE" title="Code Examples" accent={VIOLET}>
              <div>
                {result.codeExamples.map((ex, i) => <CodeBlock key={i} example={ex} index={i} />)}
              </div>
            </ScanSection>
          )}

          {/* SCENE 05 · MATH — Formulas */}
          {result.formulas?.length > 0 && (
            <ScanSection scene="05 · MATH" title="Formulas" accent={AMBER}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                {result.formulas.map((f, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                    style={{ background: `${AMBER}05`, border: `1px solid ${AMBER}20`, borderRadius: 14, padding: '18px', fontFamily: 'ui-monospace, monospace' }}>
                    <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.2em', color: `${AMBER}60`, marginBottom: 10, textTransform: 'uppercase' }}>{f.name}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: AMBER, marginBottom: 12, letterSpacing: '-0.01em', wordBreak: 'break-all' }}>{f.formula}</div>
                    {f.variables && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.8, marginBottom: 10 }}>{f.variables}</div>}
                    {f.whenToUse && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, fontFamily: 'inherit', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10, marginBottom: f.derivation ? 10 : 0 }}>{f.whenToUse}</div>}
                    {f.derivation && <div style={{ fontSize: 11, color: `${AMBER}60`, lineHeight: 1.65, fontFamily: 'inherit', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8, fontStyle: 'italic' }}>Why it works: {f.derivation}</div>}
                  </motion.div>
                ))}
              </div>
            </ScanSection>
          )}

          {/* SCENE 06 · APPLY — Worked Examples */}
          {result.workedExamples?.length > 0 && (
            <ScanSection scene="06 · APPLY" title="Worked Examples" accent={CYAN}>
              <div>
                {result.workedExamples.map((ex, i) => <WorkedExample key={i} ex={ex} index={i} />)}
              </div>
            </ScanSection>
          )}

          {/* SCENE 07 · PREP — Exam Questions */}
          {result.likelyQuestions?.length > 0 && (
            <ScanSection scene="07 · PREP" title="Likely Exam Questions" accent={RED}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.likelyQuestions.map((q, i) => <ExamQuestionCard key={i} question={q} index={i} />)}
              </div>
            </ScanSection>
          )}

          {/* SCENE 08 · TEST — Quiz */}
          {result.likelyQuestions?.length > 0 && (
            <ScanSection scene="08 · TEST" title="Quiz Yourself" accent={BLUE}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px' }}>
                {!quizActive && !quizFinished && (
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 20 }}>{result.likelyQuestions.length} questions · Self-graded · Instant feedback</p>
                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={startQuiz}
                      style={{ padding: '12px 32px', borderRadius: 12, fontSize: 13, fontWeight: 800, background: `linear-gradient(135deg,${BLUE},${CYAN})`, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: `0 0 24px ${BLUE}30` }}>
                      Start Quiz →
                    </motion.button>
                  </div>
                )}
                {quizActive && !quizFinished && <QuizCard question={result.likelyQuestions[quizIndex]} index={quizIndex} total={result.likelyQuestions.length} showAnswer={showQuizAnswer} onReveal={() => setShowQuizAnswer(true)} onGrade={answerQuiz} />}
                {quizFinished && <QuizResults answers={quizAnswers} onRetry={startQuiz} />}
              </div>
            </ScanSection>
          )}

          {/* SCENE 09 · TRAPS — Misconceptions */}
          {misconceptionsList.length > 0 && (
            <ScanSection scene="09 · TRAPS" title="Misconceptions" accent={RED}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {misconceptionsList.map((m, i) => {
                  const isMR = m && typeof m === 'object' && m.myth
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                      {isMR ? (
                        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                            <div style={{ padding: '16px', background: 'rgba(239,68,68,0.06)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ fontSize: 9, fontWeight: 900, color: RED, letterSpacing: '0.2em', marginBottom: 10, fontFamily: 'monospace' }}>✕ MYTH</div>
                              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, fontStyle: 'italic', margin: 0 }}>{m.myth}</p>
                            </div>
                            <div style={{ padding: '16px', background: 'rgba(52,211,153,0.05)' }}>
                              <div style={{ fontSize: 9, fontWeight: 900, color: GREEN, letterSpacing: '0.2em', marginBottom: 10, fontFamily: 'monospace' }}>✓ REALITY</div>
                              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.65, margin: 0 }}>{m.reality}</p>
                            </div>
                          </div>
                          {m.whyPeopleBelieveIt && (
                            <div style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                              <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', fontFamily: 'monospace' }}>WHY PEOPLE BELIEVE IT — </span>
                              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>{m.whyPeopleBelieveIt}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)', borderLeft: '3px solid rgba(239,68,68,0.4)' }}>
                          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>{typeof m === 'string' ? m : JSON.stringify(m)}</span>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </ScanSection>
          )}

          {/* SCENE 10 · DRILL — Flashcards */}
          {result.coreConcepts?.length > 0 && (
            <ScanSection scene="10 · DRILL" title="Flashcards" accent={VIOLET}>
              <div style={{ background: `${VIOLET}06`, border: `1px solid ${VIOLET}20`, borderRadius: 16, padding: '28px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 20 }}>
                  {result.coreConcepts.length} cards · Term → Explanation → Example · Tap to flip
                </div>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={openFlashcards}
                  style={{ padding: '12px 32px', borderRadius: 12, fontSize: 13, fontWeight: 800, background: `linear-gradient(135deg,#7c3aed,${BLUE})`, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 0 24px rgba(124,58,237,0.3)' }}>
                  Open Flashcards →
                </motion.button>
              </div>
            </ScanSection>
          )}

          {/* Bottom bar */}
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(8,10,14,0.96)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 40 }}>
            <span style={{ fontSize: 11, color: sessionSaved ? GREEN : 'rgba(255,255,255,0.25)', fontWeight: 700 }}>
              {sessionSaved ? '✓ Session Saved' : '○ Saving...'}
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
