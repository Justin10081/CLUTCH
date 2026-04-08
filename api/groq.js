const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MAX_BODY_BYTES = 60_000
const DAILY_LIMIT = 20

// ── JWT parsing (no signature verification — Supabase RLS is the real guard) ──
function parseUserId(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const token = authHeader.slice(7)
    const payload = token.split('.')[1]
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return typeof decoded.sub === 'string' ? decoded.sub : null
  } catch { return null }
}

// ── Per-user rate limiting via Supabase REST ──────────────────────────────────
async function checkAndBumpUsage(userId) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return true // not configured → skip

  const today = new Date().toISOString().slice(0, 10)
  const base  = `${supabaseUrl}/rest/v1`
  const h = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  }

  try {
    // Read today's count
    const r = await fetch(
      `${base}/ai_usage?user_id=eq.${encodeURIComponent(userId)}&date=eq.${today}&select=count`,
      { headers: h }
    )
    const rows = await r.json()
    const current = Number(rows?.[0]?.count ?? 0)

    if (current >= DAILY_LIMIT) return false

    // Upsert incremented row
    await fetch(`${base}/ai_usage`, {
      method: 'POST',
      headers: { ...h, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ user_id: userId, date: today, count: current + 1 }),
    })
    return true
  } catch (err) {
    console.error('rate-limit check failed:', err.message)
    return true // fail open — don't block user on infra error
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────
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

  // ── Per-user rate limit ────────────────────────────────────────────────────
  const userId = parseUserId(req.headers.authorization)
  if (userId) {
    const allowed = await checkAndBumpUsage(userId)
    if (!allowed) {
      return res.status(429).json({
        error: `You've used all ${DAILY_LIMIT} AI requests for today. Your limit resets at midnight.`,
      })
    }
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
        max_tokens: typeof max_tokens === 'number' ? Math.min(max_tokens, 8000) : 4096,
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
