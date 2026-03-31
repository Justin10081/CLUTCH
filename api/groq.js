import { createClient } from '@supabase/supabase-js'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DAILY_LIMIT = 30
const MAX_BODY_BYTES = 60_000 // 60KB max — enough for any syllabus

export default async function handler(req, res) {
  // ── CORS — allow our own domains ─────────────────────────────────────────────
  const allowed = process.env.ALLOWED_ORIGIN || 'https://clutch-app-chi.vercel.app'
  res.setHeader('Access-Control-Allow-Origin', allowed)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // ── Size guard ────────────────────────────────────────────────────────────────
  if (JSON.stringify(req.body || {}).length > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'Request too large' })
  }

  // ── Groq API key — check both prefixed and unprefixed variants ────────────────
  // Vercel env vars may use VITE_ prefix (set for client build) or plain names
  const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY
  if (!apiKey) return res.status(503).json({ error: 'AI service not configured' })

  // ── Optional auth — validate Supabase JWT for rate limiting if configured ─────
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim()
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  let userId = null
  if (token && supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      })
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id || null

      // Rate limit only when auth is available and working
      if (userId) {
        const { data: allowed_flag, error: rlErr } = await supabase.rpc('check_and_increment_usage', {
          p_limit: DAILY_LIMIT,
        })
        if (!rlErr && allowed_flag === false) {
          return res.status(429).json({
            error: `Daily AI limit reached (${DAILY_LIMIT} requests/day). Resets at midnight.`,
            code: 'RATE_LIMITED',
          })
        }
      }
    } catch (_) {
      // Auth failure is non-fatal — proceed without rate limiting
    }
  }

  // ── Validate payload ──────────────────────────────────────────────────────────
  const { messages, model, response_format, temperature, max_tokens } = req.body || {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid request: messages array required' })
  }

  // Sanitize messages — enforce types and cap content length
  const safeMessages = messages.map(m => ({
    role: ['user', 'assistant', 'system'].includes(m.role) ? m.role : 'user',
    content: String(m.content || '').slice(0, 20000),
  }))

  // ── Forward to Groq ───────────────────────────────────────────────────────────
  try {
    const groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
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
