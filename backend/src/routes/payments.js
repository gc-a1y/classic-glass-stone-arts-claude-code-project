import express from 'express'
import Stripe from 'stripe'
import { supabase } from '../lib/supabase.js'

const router = express.Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

router.post('/create-intent', async (req, res) => {
  try {
    const { invoiceId, amount, method } = req.body
    if (!invoiceId || !amount || !method) {
      return res.status(400).json({ error: 'invoiceId, amount, and method are required' })
    }

    const amountCents = Math.round(amount * 100)

    let paymentIntent
    if (method === 'ach') {
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        payment_method_types: ['us_bank_account'],
        payment_method_options: {
          us_bank_account: { financial_connections: { permissions: ['payment_method'] } },
        },
        metadata: { invoiceId, method: 'ach' },
      })
    } else {
      // automatic_payment_methods is the modern Stripe approach for card payments
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        metadata: { invoiceId, method: 'card' },
      })
    }

    // Record pending payment
    await supabase.from('payments').insert({
      invoice_id: invoiceId,
      amount: amount,
      method,
      stripe_payment_intent_id: paymentIntent.id,
      status: 'pending',
      created_at: new Date().toISOString(),
    })

    res.json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error('Payment intent error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
