import express from 'express'
import Stripe from 'stripe'
import { supabase } from '../lib/supabase.js'

const router = express.Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: 'Webhook error: ' + err.message })
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object
        const { invoiceId, method } = pi.metadata

        if (invoiceId) {
          // Update payment record
          await supabase.from('payments')
            .update({ status: 'succeeded' })
            .eq('stripe_payment_intent_id', pi.id)

          // Update invoice
          const { data: invoice } = await supabase.from('invoices')
            .select('total, amount_paid')
            .eq('id', invoiceId)
            .single()

          if (invoice) {
            const paidAmount = (invoice.amount_paid || 0) + (pi.amount / 100)
            const newStatus = paidAmount >= invoice.total ? 'paid' : 'partially_paid'
            await supabase.from('invoices').update({
              amount_paid: paidAmount,
              status: newStatus,
              paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
              payment_method: method || 'card',
              updated_at: new Date().toISOString(),
            }).eq('id', invoiceId)
          }
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object
        await supabase.from('payments')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', pi.id)
        break
      }

      case 'payment_intent.processing': {
        const pi = event.data.object
        await supabase.from('payments')
          .update({ status: 'processing' })
          .eq('stripe_payment_intent_id', pi.id)
        break
      }
    }

    res.json({ received: true })
  } catch (err) {
    console.error('Webhook processing error:', err)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

export default router
