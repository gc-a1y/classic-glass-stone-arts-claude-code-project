import express from 'express'
import { supabase } from '../lib/supabase.js'
import { generateEstimatePDF } from '../lib/pdf.js'

const router = express.Router()

router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params
    const { data: estimate } = await supabase
      .from('estimates')
      .select('*, client:clients(*)')
      .eq('id', id)
      .single()

    if (!estimate) return res.status(404).json({ error: 'Estimate not found' })

    const { data: settings } = await supabase.from('settings').select('key, value')
    const settingsMap = Object.fromEntries((settings || []).map(s => [s.key, s.value]))

    const pdfBuffer = await generateEstimatePDF(estimate, settingsMap)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="estimate-${id.slice(0, 8)}.pdf"`,
    })
    res.send(pdfBuffer)
  } catch (err) {
    console.error('Estimate PDF error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
