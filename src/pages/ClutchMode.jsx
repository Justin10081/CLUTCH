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
  const timerRef = useRef(null)
  const apiKey = localStorage.getItem('clutch-ai-key') || ''

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

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const generateSurvivalGuide = async () => {
    if (!topic.trim()) return
    setError('')
    setStep('loading')
    const count = parseInt(localStorage.getItem('clutch-session-count') || '0')
    localStorage.setItem('clutch-session-count', (count + 1).toString())

    if (!apiKey) {
      await new Promise(r => setTimeout(r, 1500))
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
      setError(`AI generation failed: ${err.message}. Falling back to template.`)
      setResult(generateTemplateGuide(topic, courseLevel, examType, focusAreas))
      setStep('result')
    }
  }

  const startStudying = () => { setStep('studying'); setSecondsLeft(STUDY_PLAN_DURATION * 60); setTimerRunning(true); setCurrentPhase(0) }
  const resetAll = () => { setStep('input'); setResult(null); setTimerRunning(false); clearInterval(timerRef.current); setSecondsLeft(STUDY_PLAN_DURATION * 60) }

  return (
    <div className="space-y-6 pb-20 sm:pb-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Clutch Mode</h1>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-500/10 text-accent-400">AI</span>
        </div>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {step === 'input' && "Exam tomorrow? Tell us what you need to study."}
          {step === 'loading' && "Generating your survival guide..."}
          {step === 'result' && "Your survival guide is ready. Start the 60-minute timer when you're ready."}
          {step === 'studying' && "You're in the zone. Follow the plan below."}
        </p>
      </div>

      {step === 'input' && (
        <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>AI Setup (optional)</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: apiKey ? 'var(--color-success-500)/20' : 'var(--bg-input)', color: apiKey ? 'var(--color-success-400)' : 'var(--text-muted)' }}>
              {apiKey ? 'Connected' : 'Using templates'}
            </span>
          </div>
          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Add a free Groq API key for AI-powered guides. Without it, you'll get structured templates.</p>
          <input type="password" value={apiKey} onChange={e => localStorage.setItem('clutch-ai-key', e.target.value)} onInput={e => localStorage.setItem('clutch-ai-key', e.target.value)} className="w-full px-3 py-2 rounded-lg text-xs border outline-none focus:border-accent-500" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} placeholder="gsk_... (free from console.groq.com)" />
        </div>
      )}

      {step === 'input' && (
        <div className="space-y-4">
          <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>What's the exam on?</label>
            <input type="text" value={topic} onChange={e => setTopic(e.target.value)} className="w-full px-3 py-3 rounded-lg text-sm border outline-none focus:border-accent-500" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} placeholder="e.g., Microeconomics — Supply & Demand, Elasticity, Market Structures" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Level</label>
              <div className="space-y-2">
                {['highschool', 'undergraduate', 'graduate'].map(level => (
                  <button key={level} onClick={() => setCourseLevel(level)} className="w-full px-3 py-2 rounded-lg text-xs font-medium text-left transition" style={{ backgroundColor: courseLevel === level ? 'var(--color-accent-500)' : 'var(--bg-input)', color: courseLevel === level ? 'white' : 'var(--text-secondary)' }}>
                    {level === 'highschool' ? 'High School' : level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Exam type</label>
              <div className="space-y-2">
                {['multiple-choice', 'short-answer', 'essay', 'mixed'].map(type => (
                  <button key={type} onClick={() => setExamType(type)} className="w-full px-3 py-2 rounded-lg text-xs font-medium text-left transition" style={{ backgroundColor: examType === type ? 'var(--color-accent-500)' : 'var(--bg-input)', color: examType === type ? 'white' : 'var(--text-secondary)' }}>
                    {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Specific areas you're struggling with (optional)</label>
            <textarea value={focusAreas} onChange={e => setFocusAreas(e.target.value)} rows={2} className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none focus:border-accent-500 resize-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} placeholder="e.g., I don't understand price elasticity calculations" />
          </div>
          <button onClick={generateSurvivalGuide} disabled={!topic.trim()} className="w-full py-3.5 bg-accent-500 text-white font-bold rounded-xl hover:bg-accent-600 transition disabled:opacity-40 text-base">Generate Survival Guide</button>
        </div>
      )}

      {step === 'loading' && (
        <div className="text-center py-16">
          <div className="w-12 h-12 border-3 border-accent-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Building your survival guide...</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Identifying high-probability exam content</p>
        </div>
      )}

      {(step === 'result' || step === 'studying') && result && (
        <div className="space-y-4">
          {error && <div className="text-xs px-3 py-2 rounded-lg bg-warning-500/10 text-warning-400">{error}</div>}
          {step === 'studying' && (
            <div className="rounded-xl p-6 border-2 text-center" style={{ borderColor: 'var(--color-accent-500)', backgroundColor: 'var(--bg-card)' }}>
              <div className="text-5xl font-black font-mono" style={{ color: secondsLeft <= 300 ? 'var(--color-danger-400)' : 'var(--color-accent-400)' }}>{formatTime(secondsLeft)}</div>
              <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{secondsLeft === 0 ? "Time's up! You did it." : `Phase ${currentPhase + 1} of ${result.studyPlan?.length || 4}`}</div>
              <div className="flex justify-center gap-3 mt-4">
                <button onClick={() => setTimerRunning(!timerRunning)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}>{timerRunning ? 'Pause' : 'Resume'}</button>
                <button onClick={resetAll} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: 'var(--color-danger-400)' }}>End session</button>
              </div>
            </div>
          )}
          <Section title="Key Concepts (Know These Cold)">
            {result.keyConcepts?.map((concept, i) => (
              <div key={i} className="p-3 rounded-lg mb-2" style={{ backgroundColor: 'var(--bg-input)' }}>
                <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{concept.term}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{concept.definition}</div>
                {concept.example && <div className="text-xs mt-1 italic" style={{ color: 'var(--text-muted)' }}>Example: {concept.example}</div>}
              </div>
            ))}
          </Section>
          {result.formulas?.length > 0 && (
            <Section title="Formulas & Key Facts">
              {result.formulas.map((f, i) => (
                <div key={i} className="p-3 rounded-lg mb-2 font-mono text-sm" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--color-accent-400)' }}>
                  <div>{f.formula}</div>
                  <div className="font-sans text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{f.explanation}</div>
                </div>
              ))}
            </Section>
          )}
          <Section title="High Probability Exam Questions">
            {result.likelyQuestions?.map((q, i) => (
              <div key={i} className="p-3 rounded-lg mb-2" style={{ backgroundColor: 'var(--bg-input)' }}>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: 'var(--color-warning-500)', color: 'black' }}>Q{i + 1}</span>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{q.question}</div>
                    <details className="mt-1">
                      <summary className="text-xs cursor-pointer" style={{ color: 'var(--color-accent-400)' }}>Show answer</summary>
                      <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{q.answer}</div>
                    </details>
                  </div>
                </div>
              </div>
            ))}
          </Section>
          {result.commonMistakes?.length > 0 && (
            <Section title="Common Mistakes (Don't Do These)">
              {result.commonMistakes.map((m, i) => (
                <div key={i} className="p-3 rounded-lg mb-2 border-l-3" style={{ backgroundColor: 'var(--bg-input)', borderLeftColor: 'var(--color-danger-400)' }}>
                  <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{m}</div>
                </div>
              ))}
            </Section>
          )}
          <Section title="60-Minute Study Plan">
            {result.studyPlan?.map((phase, i) => (
              <div key={i} className="p-3 rounded-lg mb-2 border-l-3 transition" style={{ backgroundColor: step === 'studying' && i === currentPhase ? 'var(--color-accent-500)/10' : 'var(--bg-input)', borderLeftColor: step === 'studying' && i === currentPhase ? 'var(--color-accent-500)' : 'var(--border-color)' }}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{phase.title}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}>{phase.minutes} min</span>
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{phase.description}</div>
              </div>
            ))}
          </Section>
          {step === 'result' && (
            <div className="flex gap-3">
              <button onClick={startStudying} className="flex-1 py-3 bg-accent-500 text-white font-bold rounded-xl hover:bg-accent-600 transition">Start 60-Minute Timer</button>
              <button onClick={resetAll} className="px-4 py-3 rounded-xl border font-medium text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>New topic</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{title}</h3>
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
      { term: 'Lectures vs. Textbook', definition: 'If your professor emphasized something in lecture that differs from the textbook, go with what they said. Exams follow the professor.', example: 'Review lecture slides first, textbook second.' },
    ],
    formulas: [
      { formula: 'Review all formulas from your formula sheet or notes', explanation: "Write each formula down 3 times from memory. If you can't, that's what you need to study." },
      { formula: 'Know the UNITS for every formula', explanation: 'Exams often test whether you know what units to use. This is easy marks.' },
      { formula: 'Practice plugging in numbers', explanation: "Don't just memorize — do 2-3 practice calculations for each formula." },
    ],
    likelyQuestions: [
      { question: `Define the key terms and concepts of ${topic}`, answer: 'Use precise definitions from your notes. Include examples where possible to show understanding.' },
      { question: `Compare and contrast the main theories/approaches in ${topic}`, answer: 'Make a comparison table with similarities and differences. This is a common exam format.' },
      { question: 'Apply your knowledge to a real-world scenario', answer: 'Practice taking a concept and explaining how it works in a practical situation.' },
      { question: 'What are the limitations or criticisms?', answer: 'Professors love asking about weaknesses of theories. Know at least 2 criticisms for major concepts.' },
      { question: `How does ${topic} connect to other topics in this course?`, answer: 'Show that you understand the big picture, not just isolated facts.' },
    ],
    commonMistakes: [
      'Not reading the full question — students lose marks by answering what they THINK was asked',
      'Writing too much for short-answer questions — be concise and direct',
      "Skipping questions you're unsure about — write something, partial marks exist",
      'Not managing time — check how many marks each question is worth and allocate time accordingly',
      'Forgetting to show your work on calculation questions',
    ],
    studyPlan: [
      { title: 'Quick Review', minutes: 15, description: `Read through all your notes on ${topic}. Don't memorize yet — just refresh your memory on what exists. Star anything you don't recognize.` },
      { title: 'Active Recall', minutes: 20, description: 'Close your notes. Write down everything you can remember. Then open your notes and fill in the gaps. Focus on what you FORGOT.' },
      { title: 'Practice Questions', minutes: 15, description: 'Do practice problems or answer the likely exam questions above WITHOUT looking at answers first. Check after.' },
      { title: 'Final Cram', minutes: 10, description: "Review only the things you got wrong or forgot. Read through formulas one more time. You're ready." },
    ],
  }
}
