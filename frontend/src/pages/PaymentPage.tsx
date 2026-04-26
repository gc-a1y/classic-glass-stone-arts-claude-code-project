import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { CheckCircle, Building2, CreditCard, Mail, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import api from '../lib/api'
import { Invoice } from '../types'
import { formatCurrency, formatDate } from '../lib/utils'
import { Skeleton } from '../components/ui/Skeleton'
import toast from 'react-hot-toast'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')

type PaymentOption = 'ach' | 'card' | 'check' | null

// Deferred intent flow:
// 1. Elements initialised with mode:'payment' (no clientSecret upfront)
// 2. User fills in card details
// 3. On submit: elements.submit() → create PI on server → confirmPayment with clientSecret
// This avoids the React StrictMode double-effect bug (which created two PIs and
// left Elements out of sync with state) and eliminates automatic_payment_methods
// redirect ambiguity.

function StripeCheckoutForm({ invoiceId, amount, method, onSuccess }: {
  invoiceId: string; amount: number; method: 'ach' | 'card'; onSuccess: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!stripe || !elements) return
    setProcessing(true)
    setError('')

    try {
      // Step 1 — validate the Elements form fields
      const { error: submitError } = await elements.submit()
      if (submitError) {
        setError(submitError.message || 'Please check your payment details.')
        return
      }

      // Step 2 — create the payment intent on the server
      const { data } = await api.post('/api/payments/create-intent', { invoiceId, amount, method })
      if (!data?.clientSecret) {
        setError('Server did not return a payment secret. Check backend logs.')
        return
      }

      // Step 3 — confirm with the freshly-created clientSecret
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: data.clientSecret,
        confirmParams: { return_url: `${window.location.origin}/pay/${invoiceId}?success=true` },
        redirect: 'if_required',
      })

      if (confirmError) {
        setError(`${confirmError.message} (code: ${confirmError.code ?? 'unknown'})`)
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess()
        toast.success('Payment successful!')
      } else if (paymentIntent && paymentIntent.status === 'processing') {
        onSuccess()
        toast.success('Payment is processing — you will receive confirmation shortly.')
      } else {
        setError(`Unexpected payment status: ${paymentIntent?.status ?? 'none'}. Contact support.`)
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Payment failed. Please try again.'
      setError(msg)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && (
        <div className="flex items-start gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-input px-3 py-2">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      <button
        type="submit"
        disabled={processing || !stripe || !elements}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {processing
          ? <><div className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> Processing...</>
          : <><CheckCircle size={16} /> Pay {formatCurrency(amount)}</>
        }
      </button>
    </form>
  )
}

function StripePaymentWrapper({ invoiceId, amount, method, onSuccess }: {
  invoiceId: string; amount: number; method: 'ach' | 'card'; onSuccess: () => void
}) {
  const surchargedAmount = method === 'card' ? amount * 1.03 : amount
  const amountCents = Math.round(surchargedAmount * 100)

  // Initialise Elements in deferred mode — clientSecret comes later at submit time.
  // paymentMethodTypes must match what the server will create.
  const elementsOptions = {
    mode: 'payment' as const,
    amount: amountCents,
    currency: 'usd',
    paymentMethodTypes: method === 'ach' ? ['us_bank_account'] : ['card'],
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#C9A84C',
        colorBackground: '#FFFFFF',
        colorText: '#1A1714',
        colorTextSecondary: '#6B6560',
        colorDanger: '#dc2626',
        borderRadius: '8px',
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      rules: {
        '.Input': { border: '1px solid #E5E2DC', boxShadow: 'none' },
        '.Input:focus': { border: '1px solid #C9A84C', boxShadow: '0 0 0 3px rgba(201,168,76,0.15)' },
        '.Label': { color: '#6B6560', fontWeight: '500', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.06em' },
        '.Tab': { border: '1px solid #E5E2DC', background: '#F7F6F3' },
        '.Tab:hover': { border: '1px solid #C9A84C' },
        '.Tab--selected': { border: '1px solid #C9A84C', background: '#FFFFFF', boxShadow: '0 0 0 3px rgba(201,168,76,0.15)' },
      },
    },
  }

  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      <StripeCheckoutForm
        invoiceId={invoiceId}
        amount={surchargedAmount}
        method={method}
        onSuccess={onSuccess}
      />
    </Elements>
  )
}

export default function PaymentPage() {
  const { invoiceId } = useParams()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<PaymentOption>(null)
  const [success, setSuccess] = useState(false)
  const [checkInstructions, setCheckInstructions] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true') setSuccess(true)
  }, [])

  useEffect(() => {
    if (!invoiceId) return
    Promise.all([
      supabase.from('invoices').select('*, client:clients(name, email, address)').eq('id', invoiceId).single(),
      supabase.from('settings').select('key, value').in('key', ['check_instructions', 'business_address']),
    ]).then(([{ data: inv }, { data: settings }]) => {
      if (inv) setInvoice(inv as unknown as Invoice)
      const checkSetting = settings?.find(s => s.key === 'check_instructions')
      const addrSetting = settings?.find(s => s.key === 'business_address')
      if (checkSetting) setCheckInstructions(checkSetting.value)
      if (addrSetting) setBusinessAddress(addrSetting.value)
      setLoading(false)
    })
  }, [invoiceId])

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <Skeleton className="h-96 w-full max-w-lg" />
    </div>
  )

  if (!invoice) return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="text-center">
        <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-text">Invoice Not Found</h1>
        <p className="text-text-muted mt-2">This invoice doesn't exist or has been removed.</p>
      </div>
    </div>
  )

  if (success || invoice.status === 'paid') return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
      <div className="card text-center max-w-md w-full animate-scale-in" style={{ boxShadow: '0 8px 32px rgba(26,23,20,0.10)' }}>
        <img src="/logo.png" alt="Classic Glass & Stone Arts" className="h-14 w-auto object-contain mx-auto mb-6" />
        <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={30} className="text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-text tracking-tight">Payment Confirmed</h1>
        <p className="text-text-muted mt-2 text-sm leading-relaxed">Thank you! Your payment for <strong className="text-text font-semibold">{invoice.invoice_number}</strong> has been received.</p>
        <div className="my-5 py-4 border-y border-border">
          <p className="text-3xl font-bold text-gold tracking-tight">{formatCurrency(invoice.total)}</p>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">A confirmation email will be sent shortly. For questions, contact <strong className="text-text">Classic Glass & Stone Arts</strong>.</p>
      </div>
    </div>
  )

  const balanceDue = invoice.total - (invoice.amount_paid || 0)

  return (
    <div className="min-h-screen bg-[#FAFAF8] py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Branding */}
        <div className="text-center pb-2">
          <img
            src="/logo.png"
            alt="Classic Glass & Stone Arts"
            className="h-20 w-auto object-contain mx-auto mb-3"
          />
          <div className="inline-flex items-center gap-1.5 bg-white border border-border rounded-full px-3 py-1 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Secure Payment Portal</span>
          </div>
        </div>

        {/* Invoice Summary */}
        <div className="card" style={{ boxShadow: '0 2px 12px rgba(26,23,20,0.07)' }}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Invoice</p>
              <p className="font-bold text-text text-lg leading-tight mt-0.5">{invoice.invoice_number}</p>
              <p className="text-sm text-text-muted mt-1">For: <span className="text-text font-medium">{(invoice.client as any)?.name}</span></p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Due Date</p>
              <p className="text-sm font-medium text-text mt-0.5">{formatDate(invoice.due_date)}</p>
            </div>
          </div>
          <div className="border-t border-border mt-4 pt-4 flex justify-between items-center">
            <span className="font-semibold text-text">Balance Due</span>
            <span className="text-3xl font-bold text-gold tracking-tight">{formatCurrency(balanceDue)}</span>
          </div>
        </div>

        {/* Payment Options */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest px-0.5">Choose Payment Method</p>

          {/* Option A: ACH */}
          <div className={`card transition-all duration-200 ${selected === 'ach' ? 'border-gold' : 'border-border hover:border-gold/40'}`}
            style={selected === 'ach' ? { boxShadow: '0 0 0 3px rgba(201,168,76,0.12), 0 2px 12px rgba(26,23,20,0.06)' } : {}}>
            <div
              className="flex items-start gap-4 cursor-pointer select-none"
              onClick={() => setSelected(selected === 'ach' ? null : 'ach')}
            >
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Building2 size={19} className="text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-text">Bank Transfer (ACH)</p>
                  <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px]">Recommended</span>
                </div>
                <p className="text-sm text-text-muted mt-0.5">No fees · 3–5 business day settlement</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-emerald-600 text-base">{formatCurrency(balanceDue)}</p>
                <p className="text-[11px] text-text-muted">No fees</p>
              </div>
            </div>
            {selected === 'ach' && (
              <div className="mt-5 pt-5 border-t border-border" onClick={e => e.stopPropagation()}>
                <StripePaymentWrapper invoiceId={invoiceId!} amount={balanceDue} method="ach" onSuccess={() => setSuccess(true)} />
              </div>
            )}
          </div>

          {/* Option B: Card */}
          <div className={`card transition-all duration-200 ${selected === 'card' ? 'border-gold' : 'border-border hover:border-gold/40'}`}
            style={selected === 'card' ? { boxShadow: '0 0 0 3px rgba(201,168,76,0.12), 0 2px 12px rgba(26,23,20,0.06)' } : {}}>
            <div
              className="flex items-start gap-4 cursor-pointer select-none"
              onClick={() => setSelected(selected === 'card' ? null : 'card')}
            >
              <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CreditCard size={19} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text">Credit or Debit Card</p>
                <p className="text-sm text-text-muted mt-0.5">3% processing fee applies</p>
                <p className="text-[11px] text-amber-600 mt-1 font-medium">Surcharge per Virginia state regulations</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-blue-600 text-base">{formatCurrency(balanceDue * 1.03)}</p>
                <p className="text-[11px] text-text-muted">+3% fee</p>
              </div>
            </div>
            {selected === 'card' && (
              <div className="mt-5 pt-5 border-t border-border" onClick={e => e.stopPropagation()}>
                <div className="bg-amber-50 border border-amber-200/60 rounded-input p-3 mb-4">
                  <p className="text-xs text-amber-700">A 3% processing fee ({formatCurrency(balanceDue * 0.03)}) will be added, bringing your total to <strong>{formatCurrency(balanceDue * 1.03)}</strong>. Applied per applicable state regulations.</p>
                </div>
                <StripePaymentWrapper invoiceId={invoiceId!} amount={balanceDue} method="card" onSuccess={() => setSuccess(true)} />
              </div>
            )}
          </div>

          {/* Option C: Check */}
          <div className={`card transition-all duration-200 ${selected === 'check' ? 'border-gold' : 'border-border hover:border-gold/40'}`}
            style={selected === 'check' ? { boxShadow: '0 0 0 3px rgba(201,168,76,0.12), 0 2px 12px rgba(26,23,20,0.06)' } : {}}>
            <div
              className="flex items-start gap-4 cursor-pointer select-none"
              onClick={() => setSelected(selected === 'check' ? null : 'check')}
            >
              <div className="w-10 h-10 rounded-full bg-gold/[0.08] border border-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mail size={19} className="text-gold" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-text">Pay by Check</p>
                <p className="text-sm text-text-muted mt-0.5">No fees · Mail or drop off</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-gold text-base">{formatCurrency(balanceDue)}</p>
                <p className="text-[11px] text-text-muted">No fees</p>
              </div>
            </div>
            {selected === 'check' && (
              <div className="mt-5 pt-5 border-t border-border text-sm space-y-2">
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Make check payable to</p>
                <p className="text-gold font-bold text-lg">Classic Glass & Stone Arts</p>
                {businessAddress && (
                  <div className="mt-2">
                    <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-1">Mailing Address</p>
                    <p className="text-text text-sm">{businessAddress}</p>
                  </div>
                )}
                {checkInstructions && (
                  <div className="bg-surface-2 rounded-input p-3 mt-2">
                    <p className="text-text-muted text-xs whitespace-pre-line">{checkInstructions}</p>
                  </div>
                )}
                <p className="text-text-muted text-xs pt-1">
                  Include invoice <strong className="text-text">#{invoice.invoice_number}</strong> in the memo line.
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-text-muted pb-8">
          Payments secured by Stripe · Classic Glass & Stone Arts
        </p>
      </div>
    </div>
  )
}
