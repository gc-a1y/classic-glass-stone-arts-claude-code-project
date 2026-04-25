import express from 'express'
import sgMail from '@sendgrid/mail'
import { supabase } from '../lib/supabase.js'
import { generateInvoicePDF } from '../lib/pdf.js'

const router = express.Router()
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '')

// Send invoice via email
router.post('/:id/send-email', async (req, res) => {
  try {
    const { id } = req.params
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*, client:clients(name, email)')
      .eq('id', id)
      .single()

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' })

    const client = invoice.client
    if (!client?.email) return res.status(400).json({ error: 'Client has no email address' })

    const { data: settings } = await supabase.from('settings').select('key, value')
      .in('key', ['business_name', 'business_email'])
    const settingsMap = Object.fromEntries((settings || []).map(s => [s.key, s.value]))
    const businessName = settingsMap.business_name || 'Classic Glass & Stone Arts'
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || settingsMap.business_email

    const paymentUrl = `${process.env.FRONTEND_URL}/pay/${id}`

    const msg = {
      to: client.email,
      from: fromEmail,
      subject: `Invoice ${invoice.invoice_number} from ${businessName}`,
      html: `
        <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: #F5F5F5; padding: 32px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #2A2A2A;">
            <h1 style="color: #B8973A; font-size: 24px; margin: 0;">${businessName}</h1>
          </div>
          <p style="color: #888888; font-size: 14px;">Dear ${client.name},</p>
          <p style="color: #F5F5F5; font-size: 14px;">Please find your invoice attached. You can view and pay online using the button below.</p>
          <div style="background: #111111; border: 1px solid #2A2A2A; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #888888; font-size: 13px;">Invoice Number</span>
              <span style="color: #F5F5F5; font-weight: 600;">${invoice.invoice_number}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #888888; font-size: 13px;">Due Date</span>
              <span style="color: #F5F5F5;">${new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px solid #2A2A2A; padding-top: 12px; margin-top: 12px;">
              <span style="color: #888888; font-size: 13px; font-weight: 600;">Amount Due</span>
              <span style="color: #B8973A; font-size: 20px; font-weight: 700;">$${invoice.total.toFixed(2)}</span>
            </div>
          </div>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${paymentUrl}" style="background: #B8973A; color: #0A0A0A; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">
              View & Pay Invoice
            </a>
          </div>
          <p style="color: #888888; font-size: 12px; text-align: center; margin-top: 32px;">
            You can pay via bank transfer (free), card (+3% fee), or check.<br/>
            Questions? Reply to this email or contact ${businessName}.
          </p>
        </div>
      `,
    }

    await sgMail.send(msg)
    res.json({ success: true })
  } catch (err) {
    console.error('Email send error:', err)
    res.status(500).json({ error: err.message || 'Failed to send email' })
  }
})

// Generate invoice PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*, client:clients(*)')
      .eq('id', id)
      .single()

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' })

    const { data: settings } = await supabase.from('settings').select('key, value')
    const settingsMap = Object.fromEntries((settings || []).map(s => [s.key, s.value]))

    const pdfBuffer = await generateInvoicePDF(invoice, settingsMap)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number}.pdf"`,
    })
    res.send(pdfBuffer)
  } catch (err) {
    console.error('PDF generation error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
