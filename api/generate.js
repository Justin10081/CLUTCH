export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return res.status(503).json({ error: 'AI not configured' })

  const { topic, courseLevel, examType, focusAreas } = req.body || {}
  if (!topic) return res.status(400).json({ error: 'Missing topic' })

  const prompt = buildPrompt(topic, courseLevel || 'undergraduate', examType || 'mixed', focusAreas || '')

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
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(502).json({ error: `Groq error: ${response.status}`, detail: err })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) return res.status(502).json({ error: 'Empty response from AI' })

    // Parse JSON from AI response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return res.status(502).json({ error: 'Could not parse AI response' })

    const parsed = JSON.parse(jsonMatch[0])
    return res.status(200).json(parsed)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

function buildPrompt(topic, level, examType, focusAreas) {
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
- Keep everything concise
- For ${examType} format, tailor the questions accordingly
- Return ONLY valid JSON, no other text`
}
