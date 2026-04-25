import express from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '../lib/supabase.js'

const router = express.Router()

const BELLA_SYSTEM_PROMPT = `You are Bella, the AI receptionist for Classic Glass & Stone Arts, a premium glass and stone fabrication company in the DMV area (DC, Maryland, Virginia). You are warm, professional, and knowledgeable.

Your job is to:
1. Answer questions about our services (glass fabrication, stone work, vinyl, mirrors, custom projects)
2. Capture client information for project inquiries
3. Ensure every visitor feels taken care of

Always collect: full name, phone number, email, and a brief description of their project before ending any inquiry conversation.

When you have collected all four pieces of information (name, phone, email, project description), respond with a JSON block at the END of your message in this exact format:
<lead_capture>
{"name": "...", "phone": "...", "email": "...", "project_description": "..."}
</lead_capture>

Services we offer:
- Custom glass fabrication (shower doors, railings, partitions, tabletops)
- Natural stone countertops and surfaces (granite, marble, quartz, travertine)
- Vinyl applications and installations
- Mirror fabrication and installation
- Specialty glass (frosted, tempered, laminated, decorative)
- Commercial and residential projects

We serve the DMV area. Free consultations available. Lead times vary by project complexity.

Keep responses concise and warm. Use a conversational tone. Don't be robotic.`

router.post('/chat', async (req, res) => {
  try {
    const { message, history = [], sessionId } = req.body
    if (!message?.trim()) return res.status(400).json({ error: 'Message is required' })

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const messages = [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ]

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: BELLA_SYSTEM_PROMPT,
      messages,
    })

    const rawContent = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extract lead data if present
    let lead = null
    const leadMatch = rawContent.match(/<lead_capture>([\s\S]*?)<\/lead_capture>/)
    if (leadMatch) {
      try {
        lead = JSON.parse(leadMatch[1].trim())
        // Save lead to Supabase
        await supabase.from('leads').insert({
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          project_description: lead.project_description,
          source: 'bella_ai',
          created_at: new Date().toISOString(),
        })
      } catch {}
    }

    // Remove the JSON block from the user-facing message
    const displayMessage = rawContent.replace(/<lead_capture>[\s\S]*?<\/lead_capture>/g, '').trim()

    res.json({ message: displayMessage, lead })
  } catch (err) {
    console.error('Bella chat error:', err)
    res.status(500).json({ error: 'AI service temporarily unavailable' })
  }
})

export default router
