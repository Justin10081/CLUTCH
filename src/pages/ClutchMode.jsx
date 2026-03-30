import { useState, useEffect, useRef } from 'react'

const STUDY_PLAN_DURATION = 60

export default function ClutchMode() {
  const [step, setStep] = useState('input')
  const [topic, setTopic] = useState('')
  const [courseLevel, setCourseLevel] = useState('undergraduate')
  const [examType, setExamType] = useState('multiple-choice')
  const [focusAreas, setFocusAreas] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [timerRunning, setTimerRunning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(STUDY_PLAN_DURATION * 60)
  const [currentPhase, setCurrentPhase] = useState(0)
  const [loadingDot, setLoadingDot] = useState(0)
  const timerRef = useRef(null)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('clutch-ai-key') || '')

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

  useEffect(() => {
    if (step !== 'loading') return
    const interval = setInterval(() => setLoadingDot(d => (d + 1) % 3), 500)
    return () => clearInterval(interval)
  }, [step])

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const timerPercent = ((STUDY_PLAN_DURATION * 60 - secondsLeft) / (STUDY_PLAN_DURATION * 60)) * 100
  const circumference = 2 * Math.PI * 54

  const saveKey = (val) => {
    setApiKey(val)
    localStorage.setItem('clutch-ai-key', val)
  }

  const generateSurvivalGuide = async () => {
    if (!topic.trim()) return
    setError('')
    setStep('loading')
    const count = parseInt(localStorage.getItem('clutch-session-count') || '0')
    localStorage.setItem('clutch-session-count', (count + 1).toString())

    if (!apiKey) {
      await new Promise(r => setTimeout(r, 2000))
      setResult(generateTemplateGuide(topic, courseLevel, examType, focusAreas))
      setStep('result')
      return
    }

    try {
      const prompt = buildPrompt(topic, courseLevel, examType, focusAreas)
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 4000 }),
      })
      if (!response.ok) throw new Error(`API error: ${response.status}`)
      const data = await response.json()
      const content = data.choices?.[0]?.message?.content
      if (!content) throw new Error('No response from AI')
      setResult(parseAIResponse(content, topic))
      setStep('result')
    } catch (err) {
      setError(`AI failed: ${err.message}. Using template instead.`)
      setResult(generateTemplateGuide(topic, courseLevel, examType, focusAreas))
      setStep('result')
    }
  }

  const startStudying = () => { setStep('studying'); setSecondsLeft(STUDY_PLAN_DURATION * 60); setTimerRunning(true); setCurrentPhase(0) }
  const resetAll = () => { setStep('input'); setResult(null); setTimerRunning(false); clearInterval(timerRef.current); setSecondsLeft(STUDY_PLAN_DURATION * 60); setTopic(''); setFocusAreas('') }

  return (
    <div className="space-y-5 pb-24 sm:pb-8 animate-fade-up">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
            <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>Clutch Mode</h1>
          <span className="badge" style={{ backgroundColor: 'var(--glow-color-soft)', color: 'var(--color-accent-400)' }}>AI</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {step === 'input' && "Exam tomorrow? Tell us what you need to study."}
          {step === 'loading' && "Building your survival guide..."}
          {step === 'result' && `Your ${topic} survival guide is ready.`}
          {step === 'studying' && "You're in the zone. Follow the plan below."}
        </p>
      </div>

      {/* Step indicator */}
      {step !== 'input' && (
        <div className="flex items-center gap-2">
          {['input', 'result', 'studying'].map((s, i) => {
            const steps = ['input', 'result', 'studying']
            const currentIdx = steps.indexOf(step === 'loading' ? 'input' : step)
            const isComplete = i < currentIdx
            const isActive = i === currentIdx || (s === 'input' && step === 'loading')
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300`}
                  style={{
                    backgroundColor: isComplete ? 'var(--color-success-500)' : isActive ? '#7c3aed' : 'var(--bg-input)',
                    color: isComplete || isActive ? 'white' : 'var(--text-muted)'
                  }}>
                  {isComplete ? '✓' : i + 1}
                </div>
                <span className="text-xs font-medium" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {['Setup', 'Guide', 'Study'][i]}
                </span>
                {i < 2 && <div className="w-6 h-px" style={{ backgroundColor: 'var(--border-color)' }} />}
              </div>
            )
          })}
        </div>
      )}

      {/* Input step */}
      {step === 'input' && (
        <div className="space-y-4 animate-fade-up">
          {/* AI Key */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Groq API Key</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Free from console.groq.com — enables real AI responses</p>
              </div>
              <span className="badge" style={{ backgroundColor: apiKey ? 'rgba(34,197,94,0.15)' : 'var(--bg-input)', color: apiKey ? 'var(--color-success-400)' : 'var(--text-muted)' }}>
                {apiKey ? '● Connected' : '○ Templates'}
              </span>
            </div>
            <input type="password" value={apiKey} onChange={e => saveKey(e.target.value)}
              className="input w-full px-3 py-2.5 text-xs"
              placeholder="gsk_..." />
          </div>

          {/* Topic */}
          <div className="card p-4">
            <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
              What's your exam on? *
            </label>
            <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
              className="input w-full px-4 py-3 text-sm"
              placeholder="e.g., Microeconomics — Supply & Demand, Elasticity, Market Structures"
              onKeyDown={e => e.key === 'Enter' && topic.trim() && generateSurvivalGuide()} />
          </div>

          {/* Level + Exam type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4">
              <label className="block text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Level</label>
              <div className="space-y-2">
                {[['highschool', 'High School'], ['undergraduate', 'Undergrad'], ['graduate', 'Graduate']].map(([val, label]) => (
                  <button key={val} onClick={() => setCourseLevel(val)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all duration-200"
                    style={{ background: courseLevel === val ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'var(--bg-input)', color: courseLevel === val ? 'white' : 'var(--text-secondary)' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="card p-4">
              <label className="block text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Exam Type</label>
              <div className="space-y-2">
                {[['multiple-choice', 'Multiple Choice'], ['short-answer', 'Short Answer'], ['essay', 'Essay'], ['mixed', 'Mixed']].map(([val, label]) => (
                  <button key={val} onClick={() => setExamType(val)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all duration-200"
                    style={{ background: examType === val ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'var(--bg-input)', color: examType === val ? 'white' : 'var(--text-secondary)' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Struggling with */}
          <div className="card p-4">
            <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
              What are you struggling with? <span className="font-normal normal-case opacity-60">(optional)</span>
            </label>
            <textarea value={focusAreas} onChange={e => setFocusAreas(e.target.value)} rows={2}
              className="input w-full px-4 py-3 text-sm resize-none"
              placeholder="e.g., I can't wrap my head around price elasticity calculations..." />
          </div>

          <button onClick={generateSurvivalGuide} disabled={!topic.trim()} className="btn-glow w-full py-4 text-base">
            Generate Survival Guide ⚡
          </button>
        </div>
      )}

      {/* Loading */}
      {step === 'loading' && (
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
          <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-accent-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-accent-500 animate-spin" />
            <div className="absolute inset-3 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--glow-color-soft)' }}>
              <svg className="w-7 h-7" style={{ color: 'var(--color-accent-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m1.636-6.364l.707.707M6 20l.707-.707M17.657 6.343l.707-.707M18 20l-.707-.707M12 21v-1m0-16a8 8 0 100 16 8 8 0 000-16z" />
              </svg>
            </div>
          </div>
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Building your survival guide{'.'.repeat(loadingDot + 1)}
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Identifying high-probability exam content</p>
        </div>
      )}

      {/* Result / Studying */}
      {(step === 'result' || step === 'studying') && result && (
        <div className="space-y-4 animate-fade-up">
          {error && (
            <div className="text-xs px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: 'var(--color-warning-400)' }}>
              ⚠ {error}
            </div>
          )}

          {/* Timer (studying mode) */}
          {step === 'studying' && (
            <div className="card p-6 text-center">
              <div className="relative w-36 h-36 mx-auto mb-4">
                <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="var(--bg-input)" strokeWidth="8" />
                  <circle cx="60" cy="60" r="54" fill="none"
                    stroke={secondsLeft <= 300 ? 'var(--color-danger-400)' : '#7c3aed'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (timerPercent / 100) * circumference}
                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-3xl font-black font-mono" style={{ color: secondsLeft <= 300 ? 'var(--color-danger-400)' : 'var(--color-accent-400)' }}>
                    {formatTime(secondsLeft)}
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {secondsLeft === 0 ? 'Done!' : `Phase ${currentPhase + 1}/${result.studyPlan?.length || 4}`}
                  </div>
                </div>
              </div>
              {result.studyPlan?.[currentPhase] && (
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Now: {result.studyPlan[currentPhase].title}
                </p>
              )}
              <div className="flex justify-center gap-3">
                <button onClick={() => setTimerRunning(!timerRunning)}
                  className="btn-ghost px-5 py-2.5 text-sm">
                  {timerRunning ? '⏸ Pause' : '▶ Resume'}
                </button>
                <button onClick={resetAll}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium transition"
                  style={{ color: 'var(--color-danger-400)', backgroundColor: 'rgba(239,68,68,0.08)' }}>
                  End Session
                </button>
              </div>
            </div>
          )}

          {/* Key Concepts */}
          <Section title="Key Concepts" subtitle="Know these cold" icon="🧠">
            <div className="space-y-2">
              {result.keyConcepts?.map((concept, i) => (
                <div key={i} className="p-3.5 rounded-xl" style={{ backgroundColor: 'var(--bg-input)' }}>
                  <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{concept.term}</div>
                  <div className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{concept.definition}</div>
                  {concept.example && <div className="text-xs mt-1.5 italic px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}>💡 {concept.example}</div>}
                </div>
              ))}
            </div>
          </Section>

          {/* Formulas */}
          {result.formulas?.length > 0 && (
            <Section title="Formulas & Key Facts" subtitle="Memorize these" icon="📐">
              <div className="space-y-2">
                {result.formulas.map((f, i) => (
                  <div key={i} className="p-3.5 rounded-xl" style={{ backgroundColor: 'var(--bg-input)' }}>
                    <div className="font-mono text-sm font-semibold" style={{ color: 'var(--color-accent-400)' }}>{f.formula}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{f.explanation}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Exam Questions */}
          <Section title="High Probability Questions" subtitle="Practice these before you sleep" icon="🎯">
            <div className="space-y-2">
              {result.likelyQuestions?.map((q, i) => (
                <details key={i} className="rounded-xl overflow-hidden group">
                  <summary className="p-3.5 cursor-pointer flex items-center gap-3 list-none" style={{ backgroundColor: 'var(--bg-input)' }}>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg shrink-0" style={{ backgroundColor: 'rgba(245,158,11,0.2)', color: 'var(--color-warning-400)' }}>
                      Q{i + 1}
                    </span>
                    <span className="text-sm font-medium flex-1" style={{ color: 'var(--text-primary)' }}>{q.question}</span>
                    <svg className="w-4 h-4 shrink-0 transition-transform duration-200 group-open:rotate-180" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-4 pb-3.5 pt-2 text-sm leading-relaxed" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)' }}>
                    {q.answer}
                  </div>
                </details>
              ))}
            </div>
          </Section>

          {/* Common Mistakes */}
          {result.commonMistakes?.length > 0 && (
            <Section title="Common Mistakes" subtitle="Don't do these" icon="⚠️">
              <div className="space-y-2">
                {result.commonMistakes.map((m, i) => (
                  <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl" style={{ backgroundColor: 'var(--bg-input)', borderLeft: '3px solid var(--color-danger-400)' }}>
                    <span className="text-xs font-bold shrink-0 mt-0.5" style={{ color: 'var(--color-danger-400)' }}>✕</span>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{m}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Study Plan */}
          <Section title="60-Minute Study Plan" subtitle="Follow in order" icon="⏱">
            <div className="space-y-2">
              {result.studyPlan?.map((phase, i) => {
                const isActive = step === 'studying' && i === currentPhase
                return (
                  <div key={i} className="p-3.5 rounded-xl transition-all duration-300"
                    style={{
                      backgroundColor: isActive ? 'rgba(124,58,237,0.12)' : 'var(--bg-input)',
                      borderLeft: `3px solid ${isActive ? '#7c3aed' : 'transparent'}`,
                      boxShadow: isActive ? '0 0 15px rgba(124,58,237,0.1)' : 'none'
                    }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm" style={{ color: isActive ? 'var(--color-accent-400)' : 'var(--text-primary)' }}>
                        {isActive && <span className="animate-pulse mr-1">▶</span>}{phase.title}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                        {phase.minutes} min
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{phase.description}</p>
                  </div>
                )
              })}
            </div>
          </Section>

          {/* Action buttons */}
          {step === 'result' && (
            <div className="flex gap-3">
              <button onClick={startStudying} className="btn-glow flex-1 py-3.5 text-sm">
                ▶ Start 60-Min Timer
              </button>
              <button onClick={resetAll} className="btn-ghost px-5 py-3.5 text-sm">
                New Topic
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, subtitle, icon, children }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <span>{icon}</span>
        <div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          {subtitle && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

function buildPrompt(topic, level, examType, focusAreas) {
  return `You are an expert tutor. A student has an exam TOMORROW and needs an emergency study guide.\n\nTopic: ${topic}\nLevel: ${level}\nExam format: ${examType}\n${focusAreas ? `Areas they're struggling with: ${focusAreas}` : ''}\n\nGenerate a comprehensive but concise survival guide in this EXACT JSON format (no markdown, just JSON):\n{\n  "keyConcepts": [\n    { "term": "Concept Name", "definition": "Clear, concise definition", "example": "Quick example if applicable" }\n  ],\n  "formulas": [\n    { "formula": "The formula or key fact", "explanation": "What it means and when to use it" }\n  ],\n  "likelyQuestions": [\n    { "question": "A question likely to appear on the exam", "answer": "Concise but complete answer" }\n  ],\n  "commonMistakes": ["Mistake 1", "Mistake 2"],\n  "studyPlan": [\n    { "title": "Phase name", "minutes": 15, "description": "What to do in this phase" }\n  ]\n}\n\nRequirements:\n- Include 6-10 key concepts\n- Include 3-5 formulas or key facts\n- Include 5-8 likely exam questions with answers\n- Include 3-5 common mistakes\n- Create a 4-phase study plan totaling 60 minutes\n- Focus on HIGH PROBABILITY exam content\n- Keep everything concise\n- For ${examType} format, tailor the questions accordingly\n- Return ONLY valid JSON, no other text`
}

function parseAIResponse(content, topic) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
  } catch (e) { console.error('Failed to parse AI response:', e) }
  return generateTemplateGuide(topic, 'undergraduate', 'mixed', '')
}

function generateTemplateGuide(topic) {
  return {
    keyConcepts: [
      { term: `Core Principles of ${topic}`, definition: 'Review the fundamental definitions and theories covered in your course notes. Focus on bolded terms and chapter summaries.', example: 'Look at your syllabus for the main themes.' },
      { term: 'Key Vocabulary', definition: 'Make a list of all technical terms from your notes. If you can define them from memory, you know them.', example: 'Use flashcards or cover the definitions and test yourself.' },
      { term: 'Relationships & Connections', definition: 'Understand how different concepts relate to each other. Exams love testing whether you see the big picture.', example: 'Draw a concept map connecting the main topics.' },
      { term: 'Real-World Applications', definition: 'Be ready to apply concepts to scenarios or case studies. Professors often test application, not just memorization.', example: 'Think of one real example for each major concept.' },
      { term: 'Lecture Priority', definition: 'If your professor emphasized something in lecture that differs from the textbook, go with what they said.', example: 'Review lecture slides first, textbook second.' },
    ],
    formulas: [
      { formula: 'Review all formulas from your notes', explanation: "Write each formula down 3 times from memory. If you can't, that's what you need to study." },
      { formula: 'Know the UNITS for every formula', explanation: 'Exams often test units. Easy marks if you know them.' },
      { formula: 'Practice plugging in numbers', explanation: "Don't just memorize — do 2-3 practice calculations per formula." },
    ],
    likelyQuestions: [
      { question: `Define the key terms and concepts of ${topic}`, answer: 'Use precise definitions from your notes. Include examples to show understanding.' },
      { question: `Compare and contrast the main theories in ${topic}`, answer: 'Make a comparison table with similarities and differences.' },
      { question: 'Apply your knowledge to a real-world scenario', answer: 'Practice explaining how a concept works in a practical situation.' },
      { question: 'What are the limitations or criticisms?', answer: 'Know at least 2 criticisms for major concepts.' },
      { question: `How does ${topic} connect to other course topics?`, answer: 'Show you understand the big picture, not just isolated facts.' },
    ],
    commonMistakes: [
      'Not reading the full question — students lose marks by answering what they THINK was asked',
      'Writing too much for short-answer questions — be concise and direct',
      "Skipping questions you're unsure about — write something, partial marks exist",
      'Not managing time — allocate time by mark value',
      'Forgetting to show your work on calculation questions',
    ],
    studyPlan: [
      { title: 'Quick Review', minutes: 15, description: `Read through all notes on ${topic}. Don't memorize — refresh your memory. Star anything you don't recognize.` },
      { title: 'Active Recall', minutes: 20, description: 'Close your notes. Write down everything you remember. Then open and fill in the gaps. Focus on what you FORGOT.' },
      { title: 'Practice Questions', minutes: 15, description: 'Answer the exam questions above WITHOUT looking at answers first. Check after.' },
      { title: 'Final Cram', minutes: 10, description: "Review only things you got wrong. Read formulas one more time. You're ready." },
    ],
  }
}
