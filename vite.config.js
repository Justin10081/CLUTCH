import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // In dev, proxy /api/generate directly to Groq so the app works locally too
      // Requires VITE_GROQ_API_KEY in .env.local (never committed)
      '/api': {
        target: 'http://localhost:5174',
        bypass(req, res) {
          // Handle /api/generate locally in dev
          if (req.url === '/api/generate' && req.method === 'POST') {
            let body = ''
            req.on('data', chunk => { body += chunk })
            req.on('end', async () => {
              try {
                const { topic, courseLevel, examType, focusAreas } = JSON.parse(body)
                const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY
                if (!apiKey) {
                  res.writeHead(503, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ error: 'AI not configured' }))
                  return
                }
                const prompt = buildDevPrompt(topic, courseLevel, examType, focusAreas)
                const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                  body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 4000 }),
                })
                const data = await r.json()
                const content = data.choices?.[0]?.message?.content || ''
                const match = content.match(/\{[\s\S]*\}/)
                if (match) {
                  res.writeHead(200, { 'Content-Type': 'application/json' })
                  res.end(match[0])
                } else {
                  res.writeHead(502, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ error: 'Parse failed' }))
                }
              } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: e.message }))
              }
            })
            return null
          }
        },
      },
    },
  },
})

function buildDevPrompt(topic, level = 'undergraduate', examType = 'mixed', focusAreas = '') {
  return `You are an expert tutor. A student has an exam TOMORROW.\n\nTopic: ${topic}\nLevel: ${level}\nExam format: ${examType}\n${focusAreas ? `Struggling with: ${focusAreas}` : ''}\n\nReturn ONLY valid JSON (no markdown):\n{"keyConcepts":[{"term":"","definition":"","example":""}],"formulas":[{"formula":"","explanation":""}],"likelyQuestions":[{"question":"","answer":""}],"commonMistakes":[""],"studyPlan":[{"title":"","minutes":15,"description":""}]}\n\nInclude 6-10 concepts, 3-5 formulas, 5-8 questions, 3-5 mistakes, 4 phases totaling 60 min.`
}
