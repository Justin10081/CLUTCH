const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MAX_BODY_BYTES = 60_000

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://clutch-app-chi.vercel.app')
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (JSON.stringify(req.body || {}).length > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'Request too large' })
  }

  const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY
  if (!apiKey) {
    console.error('groq: no API key (checked GROQ_API_KEY, VITE_GROQ_API_KEY)')
    return res.status(503).json({ error: 'AI service not configured' })
  }

  const { messages, model, response_format, temperature, max_tokens } = req.body || {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' })
  }

  const safeMessages = messages.map(m => ({
    role: ['user', 'assistant', 'system'].includes(m.role) ? m.role : 'user',
    content: String(m.content || '').slice(0, 20000),
  }))

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b-versatile',
        messages: safeMessages,
        ...(response_format ? { response_format } : {}),
        temperature: typeof temperature === 'number' ? Math.min(Math.max(temperature, 0), 1) : 0.3,
        max_tokens: typeof max_tokens === 'number' ? Math.min(max_tokens, 6000) : 4096,
      }),
    })

    if (!groqRes.ok) {
      const errText = await groqRes.text()
      console.error('Groq error:', groqRes.status, errText.slice(0, 200))
      return res.status(502).json({ error: 'AI service error. Please try again.' })
    }

    const data = await groqRes.json()
    return res.status(200).json(data)
  } catch (err) {
    console.error('Groq proxy error:', err.message)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
