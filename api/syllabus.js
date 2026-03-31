export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return res.status(503).json({ error: 'AI not configured' })

  const { syllabus, courseName, courseCode } = req.body || {}
  if (!syllabus) return res.status(400).json({ error: 'Missing syllabus text' })

  const prompt = `You are a course assistant. Parse this college course syllabus and extract all graded assignments, exams, quizzes, and projects with their due dates.

Course: ${courseName || 'Unknown'} (${courseCode || ''})
Syllabus content:
${syllabus.slice(0, 10000)}

Extract all graded work items and return ONLY this JSON (no markdown):
{
  "courseName": "Full course name from syllabus (or use provided name)",
  "professor": "Professor name if found",
  "semester": "Semester/term if found",
  "deadlines": [
    {
      "title": "Assignment/exam name",
      "date": "YYYY-MM-DDTHH:MM (use noon if time not specified, current year if year unclear)",
      "type": "exam|assignment|project|quiz|essay|other",
      "weight": 5,
      "difficulty": 6,
      "notes": "Any relevant notes about this item"
    }
  ]
}

Rules:
- weight: 1-10 scale based on grade percentage (10% = weight 3, 20% = weight 5, 30% = weight 7, 40%+ = weight 9)
- difficulty: estimate 1-10 based on type (quiz=3, assignment=5, essay=6, project=7, midterm=7, final=9)
- Only include items that have dates or can be inferred to have dates
- For repeating assignments (weekly homework), create one entry for the next upcoming one
- Dates should be in the future when possible
- Return ONLY valid JSON`

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
        temperature: 0.1,
        max_tokens: 3000,
      }),
    })

    if (!response.ok) {
      return res.status(502).json({ error: 'AI parse failed' })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) return res.status(502).json({ error: 'Empty response' })

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return res.status(502).json({ error: 'Could not parse response' })

    const parsed = JSON.parse(jsonMatch[0])
    return res.status(200).json(parsed)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
