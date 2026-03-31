export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return res.status(503).json({ error: 'AI not configured' })

  const { coreConcepts, workedExamples, topic, courseCode } = req.body || {}
  if (!coreConcepts?.length) return res.status(400).json({ error: 'No concepts provided' })

  const prompt = `You are a professor creating a rigorous 10-question multiple choice exam.

Topic: ${topic || 'General'}
Course: ${courseCode || 'Unknown'}

Core concepts to test:
${coreConcepts.slice(0, 8).map(c => `- ${c.term}: ${c.explanation}`).join('\n')}

${workedExamples?.length ? `Worked examples for context:\n${workedExamples.slice(0, 3).map(e => `- ${e.problem}`).join('\n')}` : ''}

Generate exactly 10 multiple choice questions. Return ONLY valid JSON (no markdown, no explanation):
{
  "questions": [
    {
      "question": "Clear, specific question text?",
      "options": ["A) first option", "B) second option", "C) third option", "D) fourth option"],
      "correct": 0,
      "explanation": "Why A is correct, and why the others are wrong",
      "concept": "which core concept this tests"
    }
  ]
}

Rules:
- "correct" is 0-indexed (0=A, 1=B, 2=C, 3=D)
- Make distractors plausible — not obviously wrong
- Mix easy/medium/hard difficulty
- Cover different concepts across the 10 questions
- Return ONLY valid JSON with no surrounding text`

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

    if (!response.ok) return res.status(502).json({ error: 'AI request failed' })

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) return res.status(502).json({ error: 'Empty AI response' })

    const match = content.match(/\{[\s\S]*\}/)
    if (!match) return res.status(502).json({ error: 'Could not parse quiz JSON' })

    const parsed = JSON.parse(match[0])
    if (!parsed.questions?.length) return res.status(502).json({ error: 'No questions generated' })

    return res.status(200).json(parsed)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
