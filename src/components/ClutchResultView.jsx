import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'

// ─── Constants ────────────────────────────────────────────────────────────────
const BLUE = '#3b82f6'
const CYAN = '#06b6d4'
const VIOLET = '#8b5cf6'
const AMBER = '#f59e0b'
const RED = '#ef4444'
const GREEN = '#34d399'
const ease = [0.16, 1, 0.3, 1]
const CONCEPT_ACCENTS = [BLUE, CYAN, VIOLET, AMBER, GREEN, '#f43f5e', '#ec4899', '#10b981']

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

// ─── ConceptCard ──────────────────────────────────────────────────────────────
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
            {item.context && <p style={{ fontSize: 12, color: `${GREEN}90`, lineHeight: 1.65, margin: '0 18px 12px', fontStyle: 'italic' }}>{item.context}</p>}
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
  const copy = () => { navigator.clipboard.writeText(example.code || '').then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }) }
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

// ─── WorkedExample ────────────────────────────────────────────────────────────
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

// ─── ExamQuestionCard ─────────────────────────────────────────────────────────
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

// ─── FlashcardOverlay ────────────────────────────────────────────────────────
function FlashcardOverlay({ concepts, order, index, flipped, onFlip, onPrev, onNext, onShuffle, onClose }) {
  const c = concepts[order[index]]
  if (!c) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ position: 'absolute', top: 24, right: 24 }}>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 16px', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✕ Close</button>
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 24, letterSpacing: '0.15em' }}>{index + 1} / {order.length}</div>
      <AnimatePresence mode="wait">
        <motion.div key={`${index}-${flipped}`} initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: -90, opacity: 0 }} transition={{ duration: 0.3 }} onClick={onFlip}
          style={{ width: '100%', maxWidth: 560, minHeight: 260, background: flipped ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.04)', border: flipped ? '1px solid rgba(59,130,246,0.25)' : '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '40px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', color: flipped ? BLUE : 'rgba(255,255,255,0.25)', marginBottom: 20 }}>{flipped ? 'BACK — Explanation' : 'FRONT — Term'}</div>
          <p style={{ fontSize: flipped ? 14 : 20, fontWeight: flipped ? 400 : 900, color: 'white', lineHeight: flipped ? 1.7 : 1.2, margin: 0 }}>{flipped ? (c.explanation || c.definition) : (c.term || c.title)}</p>
          {flipped && c.example && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 16, fontStyle: 'italic' }}>↳ {c.example}</p>}
          <div style={{ marginTop: 24, fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>TAP TO FLIP</div>
        </motion.div>
      </AnimatePresence>
      <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
        <button onClick={onPrev} disabled={index === 0} style={{ padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: index === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)', cursor: index === 0 ? 'default' : 'pointer' }}>←</button>
        <button onClick={onShuffle} style={{ padding: '10px 20px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>Shuffle</button>
        <button onClick={onNext} disabled={index === order.length - 1} style={{ padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: index === order.length - 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)', cursor: index === order.length - 1 ? 'default' : 'pointer' }}>→</button>
      </div>
    </div>
  )
}

// ─── Main ClutchResultView ────────────────────────────────────────────────────
// Props:
//   result        — the AI-generated result object
//   topic         — topic string shown in header
//   courseName    — course name
//   uploadedFiles — array of { name } for the "X files analyzed" pill
//   embedded      — if true, renders inline without fixed bottom bar (for CourseDetail)
//   onNewSession  — callback for "New Session" button (replaces resetAll in embedded mode)
export default function ClutchResultView({ result, topic, courseName, uploadedFiles = [], embedded = false, onNewSession }) {
  const [quizActive, setQuizActive] = useState(false)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState([])
  const [showQuizAnswer, setShowQuizAnswer] = useState(false)
  const [quizFinished, setQuizFinished] = useState(false)
  const [flashcardActive, setFlashcardActive] = useState(false)
  const [flashcardIndex, setFlashcardIndex] = useState(0)
  const [flashcardFlipped, setFlashcardFlipped] = useState(false)
  const [flashcardOrder, setFlashcardOrder] = useState(() => (result?.coreConcepts || []).map((_, i) => i))

  const startQuiz = () => { setQuizActive(true); setQuizIndex(0); setQuizAnswers([]); setShowQuizAnswer(false); setQuizFinished(false) }
  const answerQuiz = (grade) => {
    const newAnswers = [...quizAnswers, grade]
    setQuizAnswers(newAnswers)
    if (quizIndex + 1 >= (result?.likelyQuestions || []).length) setQuizFinished(true)
    else { setQuizIndex(quizIndex + 1); setShowQuizAnswer(false) }
  }
  const openFlashcards = () => { setFlashcardActive(true); setFlashcardIndex(0); setFlashcardFlipped(false); setFlashcardOrder((result?.coreConcepts || []).map((_, i) => i)) }
  const shuffleFlashcards = () => {
    const arr = [...flashcardOrder]
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]] }
    setFlashcardOrder(arr); setFlashcardIndex(0); setFlashcardFlipped(false)
  }

  const misconceptionsList = result?.misconceptions || result?.commonMisconceptions || result?.commonMistakes || []
  const ct = result?.contentType || 'mixed'

  if (!result) return null

  return (
    <>
      {/* Flashcard overlay */}
      {flashcardActive && result.coreConcepts?.length > 0 && (
        <FlashcardOverlay concepts={result.coreConcepts} order={flashcardOrder} index={flashcardIndex} flipped={flashcardFlipped}
          onFlip={() => setFlashcardFlipped(f => !f)}
          onPrev={() => { setFlashcardIndex(i => Math.max(0, i - 1)); setFlashcardFlipped(false) }}
          onNext={() => { setFlashcardIndex(i => Math.min(flashcardOrder.length - 1, i + 1)); setFlashcardFlipped(false) }}
          onShuffle={shuffleFlashcards} onClose={() => setFlashcardActive(false)} />
      )}

      <div style={{ padding: embedded ? '0' : '0' }}>
        {/* Stat pills */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} style={{ marginBottom: 36 }}>
          {embedded && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 900, color: GREEN, letterSpacing: '0.22em', fontFamily: 'monospace' }}>LAST SESSION</div>
                  {ct !== 'mixed' && (
                    <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.15em', padding: '3px 9px', borderRadius: 4, fontFamily: 'monospace', background: ct === 'technical' ? `${AMBER}12` : `${VIOLET}12`, color: ct === 'technical' ? AMBER : VIOLET, border: `1px solid ${ct === 'technical' ? AMBER : VIOLET}30` }}>
                      {ct === 'technical' ? '⚙ TECHNICAL' : '📖 CONCEPTUAL'}
                    </div>
                  )}
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: 0, letterSpacing: '-0.03em' }}>{topic || courseName || 'Study Guide'}</h2>
              </div>
              {onNewSession && (
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={onNewSession}
                  style={{ padding: '10px 20px', borderRadius: 10, fontSize: 12, fontWeight: 800, background: `linear-gradient(135deg,${BLUE},${CYAN})`, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: `0 0 18px ${BLUE}30`, letterSpacing: '0.06em', flexShrink: 0 }}>
                  New Session ⚡
                </motion.button>
              )}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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

        {/* SCENE 00 · DECODE */}
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

        {/* SCENE 01 · DATA */}
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

        {/* SCENE 02 · INSIGHT */}
        {result.teacherNotes?.length > 0 && (
          <ScanSection scene="02 · INSIGHT" title="Teacher's Notes" accent={AMBER}>
            {result.teacherNotes.map((note, i) => <TeacherNote key={i} note={note} index={i} />)}
          </ScanSection>
        )}

        {/* SCENE 03 · CORE */}
        {(result.coreConcepts?.length > 0 || result.keyConcepts?.length > 0) && (
          <ScanSection scene="03 · CORE" title="Core Concepts" accent={BLUE}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {(result.coreConcepts || result.keyConcepts || []).map((concept, i) => (
                <ConceptCard key={i} concept={concept} index={i} />
              ))}
            </div>
          </ScanSection>
        )}

        {/* SCENE 04 · VISUAL */}
        {result.diagrams?.length > 0 && (
          <ScanSection scene="04 · VISUAL" title="Diagrams & Visual Aids" accent={CYAN}>
            {result.diagrams.map((d, i) => <DiagramBlock key={i} diagram={d} index={i} />)}
          </ScanSection>
        )}

        {/* SCENE 04 · STEPS */}
        {result.stepByStep?.length > 0 && (
          <ScanSection scene="04 · STEPS" title="Step-by-Step Procedures" accent={GREEN}>
            {result.stepByStep.map((item, i) => <StepBlock key={i} item={item} index={i} />)}
          </ScanSection>
        )}

        {/* SCENE 04 · CODE */}
        {result.codeExamples?.length > 0 && (
          <ScanSection scene="04 · CODE" title="Code Examples" accent={VIOLET}>
            {result.codeExamples.map((ex, i) => <CodeBlock key={i} example={ex} index={i} />)}
          </ScanSection>
        )}

        {/* SCENE 05 · MATH */}
        {result.formulas?.length > 0 && (
          <ScanSection scene="05 · MATH" title="Formulas" accent={AMBER}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {result.formulas.map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                  style={{ background: `${AMBER}05`, border: `1px solid ${AMBER}20`, borderRadius: 14, padding: '18px', fontFamily: 'ui-monospace, monospace' }}>
                  <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.2em', color: `${AMBER}60`, marginBottom: 10 }}>{f.name}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: AMBER, marginBottom: 12, wordBreak: 'break-all' }}>{f.formula}</div>
                  {f.variables && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.8, marginBottom: 10 }}>{f.variables}</div>}
                  {f.whenToUse && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, fontFamily: 'inherit', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10, marginBottom: f.derivation ? 10 : 0 }}>{f.whenToUse}</div>}
                  {f.derivation && <div style={{ fontSize: 11, color: `${AMBER}60`, lineHeight: 1.65, fontFamily: 'inherit', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8, fontStyle: 'italic' }}>Why it works: {f.derivation}</div>}
                </motion.div>
              ))}
            </div>
          </ScanSection>
        )}

        {/* SCENE 06 · APPLY */}
        {result.workedExamples?.length > 0 && (
          <ScanSection scene="06 · APPLY" title="Worked Examples" accent={CYAN}>
            {result.workedExamples.map((ex, i) => <WorkedExample key={i} ex={ex} index={i} />)}
          </ScanSection>
        )}

        {/* SCENE 07 · PREP */}
        {result.likelyQuestions?.length > 0 && (
          <ScanSection scene="07 · PREP" title="Likely Exam Questions" accent={RED}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {result.likelyQuestions.map((q, i) => <ExamQuestionCard key={i} question={q} index={i} />)}
            </div>
          </ScanSection>
        )}

        {/* SCENE 08 · TEST */}
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
              {quizActive && !quizFinished && (() => {
                const q = result.likelyQuestions[quizIndex]
                const pct = Math.round((quizIndex / result.likelyQuestions.length) * 100)
                return (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: BLUE, fontWeight: 700 }}>Question {quizIndex + 1} / {result.likelyQuestions.length}</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{pct}%</span>
                      </div>
                      <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${BLUE},${CYAN})`, borderRadius: 2, transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px', marginBottom: 14 }}>
                      <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.6, margin: 0 }}>{q.question}</p>
                    </div>
                    {!showQuizAnswer ? (
                      <button onClick={() => setShowQuizAnswer(true)} style={{ width: '100%', padding: '12px 0', borderRadius: 10, fontSize: 13, fontWeight: 800, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>Reveal Answer</button>
                    ) : (
                      <div>
                        <div style={{ padding: '14px 16px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 10, marginBottom: 14 }}>
                          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 1.7, margin: 0 }}>{q.answer}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {[['got', GREEN, '✓ Got it'], ['almost', AMBER, '~ Almost'], ['missed', RED, '✕ Missed']].map(([g, c, label]) => (
                            <button key={g} onClick={() => answerQuiz(g)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 12, fontWeight: 800, background: `${c}14`, color: c, border: `1px solid ${c}30`, cursor: 'pointer' }}>{label}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
              {quizFinished && (() => {
                const got = quizAnswers.filter(a => a === 'got').length
                const almost = quizAnswers.filter(a => a === 'almost').length
                const missed = quizAnswers.filter(a => a === 'missed').length
                const score = Math.round(((got + almost * 0.5) / quizAnswers.length) * 100)
                return (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: 48, fontWeight: 900, color: score >= 80 ? GREEN : score >= 60 ? AMBER : RED, letterSpacing: '-0.04em', marginBottom: 8 }}>{score}%</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
                      <span style={{ fontSize: 12, color: GREEN }}>✓ {got} correct</span>
                      <span style={{ fontSize: 12, color: AMBER }}>~ {almost} close</span>
                      <span style={{ fontSize: 12, color: RED }}>✕ {missed} missed</span>
                    </div>
                    <button onClick={startQuiz} style={{ padding: '10px 24px', borderRadius: 10, fontSize: 12, fontWeight: 800, background: `linear-gradient(135deg,${BLUE},${CYAN})`, color: '#fff', border: 'none', cursor: 'pointer' }}>Retry Quiz</button>
                  </div>
                )
              })()}
            </div>
          </ScanSection>
        )}

        {/* SCENE 09 · TRAPS */}
        {misconceptionsList.length > 0 && (
          <ScanSection scene="09 · TRAPS" title="Misconceptions" accent={RED}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {misconceptionsList.map((m, i) => {
                const isMR = m && typeof m === 'object' && m.myth
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                    {isMR ? (
                      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
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

        {/* SCENE 10 · DRILL */}
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
      </div>
    </>
  )
}
