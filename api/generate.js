export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return res.status(503).json({ error: 'AI not configured' })

  const { topic, courseLevel, examType, focusAreas, mode, files, courseContext } = req.body || {}
  if (!topic && (!files || files.length === 0)) return res.status(400).json({ error: 'Missing topic or files' })

  const isTeaching = mode === 'teaching'
  const prompt = isTeaching
    ? buildTeachingPrompt(topic, courseLevel || 'undergraduate', examType || 'mixed', focusAreas || '', files || [], courseContext)
    : buildCoachingPrompt(topic, courseLevel || 'undergraduate', examType || 'mixed', focusAreas || '')

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 5000,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(502).json({ error: `Groq error: ${response.status}`, detail: err })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) return res.status(502).json({ error: 'Empty response from AI' })

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return res.status(502).json({ error: 'Could not parse AI response' })

    const parsed = JSON.parse(jsonMatch[0])
    return res.status(200).json(parsed)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

function buildTeachingPrompt(topic, level, examType, focusAreas, files, courseContext) {
  const materialsSummary = files.length > 0
    ? `\n\nSTUDENT'S UPLOADED MATERIALS:\n${files.map(f => `--- ${f.name} ---\n${f.content}`).join('\n\n').slice(0, 12000)}`
    : ''

  const courseInfo = courseContext
    ? `\nCourse: ${courseContext.name} (${courseContext.code})${courseContext.professor ? ` — Prof. ${courseContext.professor}` : ''}`
    : ''

  return `You are a brilliant professor and expert teacher. A student has an exam TOMORROW and needs you to TEACH them the content — not coach them on how to study.

Your job: Teach the material as if you're the best tutor they've ever had. Give deep, clear explanations. Use analogies. Show examples. Explain WHY things work, not just WHAT they are.

Topic: ${topic || 'See uploaded materials'}${courseInfo}
Level: ${level}
Exam format: ${examType}
${focusAreas ? `Student is confused about: ${focusAreas}` : ''}${materialsSummary}

Generate a comprehensive teaching guide in this EXACT JSON format (no markdown, just JSON):
{
  "coreConcepts": [
    {
      "term": "Concept name",
      "explanation": "Deep, clear explanation as if teaching for the first time. Use plain language. Explain the WHY.",
      "example": "A concrete, memorable example",
      "whyItMatters": "Why this appears on exams and how it connects to other concepts"
    }
  ],
  "workedExamples": [
    {
      "problem": "A problem or scenario",
      "solution": "Step-by-step solution with reasoning at each step"
    }
  ],
  "formulas": [
    { "formula": "The formula or key fact", "explanation": "What each part means and when to use it" }
  ],
  "likelyQuestions": [
    {
      "question": "A likely exam question",
      "answer": "A complete, detailed answer that would get full marks"
    }
  ],
  "commonMisconceptions": ["Misconception 1 — and why it's wrong", "Misconception 2"],
  "studyPlan": [
    { "title": "Phase name", "minutes": 15, "description": "What to do in this phase" }
  ]
}

Requirements:
- Include 6-10 core concepts with DEEP explanations (2-4 sentences each minimum)
- Include 2-4 worked examples with complete step-by-step solutions
- Include 3-5 formulas or key facts
- Include 5-8 likely exam questions with COMPLETE, detailed answers
- Include 3-5 common misconceptions (specifically what students get wrong and why)
- Study plan of 4 phases totaling 60 minutes
- If materials were uploaded, base your teaching primarily on THAT content
- Focus on content that is HIGH PROBABILITY to appear on the exam
- Return ONLY valid JSON, no other text`
}

function buildCoachingPrompt(topic, level, examType, focusAreas) {
  return `You are an expert tutor. A student has an exam TOMORROW and needs an emergency study guide.

Topic: ${topic}
Level: ${level}
Exam format: ${examType}
${focusAreas ? `Areas they're struggling with: ${focusAreas}` : ''}

Generate a comprehensive but concise survival guide in this EXACT JSON format (no markdown, just JSON):
{
  "keyConcepts": [
    { "term": "Concept Name", "definition": "Clear, concise definition", "example": "Quick example if applicable" }
  ],
  "formulas": [
    { "formula": "The formula or key fact", "explanation": "What it means and when to use it" }
  ],
  "likelyQuestions": [
    { "question": "A question likely to appear on the exam", "answer": "Concise but complete answer" }
  ],
  "commonMistakes": ["Mistake 1", "Mistake 2"],
  "studyPlan": [
    { "title": "Phase name", "minutes": 15, "description": "What to do in this phase" }
  ]
}

Requirements:
- Include 6-10 key concepts
- Include 3-5 formulas or key facts
- Include 5-8 likely exam questions with answers
- Include 3-5 common mistakes
- Create a 4-phase study plan totaling 60 minutes
- Focus on HIGH PROBABILITY exam content
- For ${examType} format, tailor the questions accordingly
- Return ONLY valid JSON, no other text`
}
