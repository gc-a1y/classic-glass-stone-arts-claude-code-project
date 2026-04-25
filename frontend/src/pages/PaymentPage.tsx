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

function StripeCheckoutForm({ invoiceId, amount, onSuccess }: {
  invoiceId: string; amount: number; onSuccess: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setProcessing(true)
    setError('')
    try {
      // Validate the Elements form fields first
      const { error: submitError } = await elements.submit()
      if (submitError) { setError(submitError.message || 'Payment failed'); setProcessing(false); return }

      // Confirm against the payment intent already created when Elements mounted
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${window.location.origin}/pay/${invoiceId}?success=true` },
        redirect: 'if_required',
      })
      if (confirmError) {
        setError(confirmError.message || 'Payment failed')
      } else {
        onSuccess()
        toast.success('Payment successful!')
      }
    } catch {
      setError('Payment failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-input px-3 py-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      <button type="submit" disabled={processing || !stripe} className="btn-primary w-full flex items-center justify-center gap-2">
        {processing ? <div className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> : <CheckCircle size={16} />}
        {processing ? 'Processing...' : `Pay ${formatCurrency(amount)}`}
      </button>
    </form>
  )
}

function StripePaymentWrapper({ invoiceId, amount, method, onSuccess }: {
  invoiceId: string; amount: number; method: 'ach' | 'card'; onSuccess: () => void
}) {
  const [clientSecret, setClientSecret] = useState('')
  const [loading, setLoading] = useState(true)
  const [initError, setInitError] = useState('')
  const surchargedAmount = method === 'card' ? amount * 1.03 : amount

  useEffect(() => {
    setLoading(true)
    setInitError('')
    api.post('/api/payments/create-intent', { invoiceId, amount: surchargedAmount, method })
      .then(({ data }) => {
        setClientSecret(data.clientSecret)
        setLoading(false)
      })
      .catch((err) => {
        const msg = err.response?.data?.error || err.message || 'Could not connect to payment server'
        setInitError(msg)
        setLoading(false)
      })
  }, [invoiceId, surchargedAmount, method])

  if (loading) return <Skeleton className="h-40 w-full" />
  if (initError || !clientSecret) return (
    <div className="text-sm space-y-1">
      <p className="text-red-400 font-medium">Failed to initialize payment.</p>
      {initError && <p className="text-text-muted text-xs">{initError}</p>}
      <p className="text-text-muted text-xs">Check that your Stripe keys are set correctly in backend/.env</p>
    </div>
  )

  return (
    <Elements stripe={stripePromise} options={{
      clientSecret,
      appearance: {
        theme: 'night',
        variables: {
          colorPrimary: '#B8973A',
          colorBackground: '#1A1A1A',
          colorText: '#F5F5F5',
          colorDanger: '#ef4444',
          borderRadius: '8px',
        },
      },
    }}>
      <StripeCheckoutForm invoiceId={invoiceId} amount={surchargedAmount} onSuccess={onSuccess} />
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
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="card text-center max-w-md w-full shadow-gold-lg">
        <div className="w-16 h-16 bg-green-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-text">Payment Confirmed</h1>
        <p className="text-text-muted mt-2">Thank you! Your payment for <strong className="text-text">{invoice.invoice_number}</strong> has been received.</p>
        <p className="text-gold font-semibold text-lg mt-4">{formatCurrency(invoice.total)}</p>
        <p className="text-xs text-text-muted mt-4">You'll receive a confirmation email shortly. For questions, contact Classic Glass & Stone Arts.</p>
      </div>
    </div>
  )

  const balanceDue = invoice.total - (invoice.amount_paid || 0)

  return (
    <div className="min-h-screen bg-bg py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Branding */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-surface border border-border mb-4 shadow-gold">
            <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
              <polygon points="24,4 44,36 4,36" stroke="#B8973A" strokeWidth="2.5" fill="none"/>
              <polygon points="24,14 38,36 10,36" stroke="#B8973A" strokeWidth="1.5" fill="rgba(184,151,58,0.08)"/>
              <circle cx="24" cy="24" r="4" fill="#B8973A" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-text">Classic Glass & Stone Arts</h1>
          <p className="text-text-muted text-sm">Secure Payment Portal</p>
        </div>

        {/* Invoice Summary */}
        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">Invoice</p>
              <p className="font-bold text-text">{invoice.invoice_number}</p>
              <p className="text-sm text-text-muted mt-0.5">For: {(invoice.client as any)?.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-muted">Due Date</p>
              <p className="text-sm text-text">{formatDate(invoice.due_date)}</p>
            </div>
          </div>
          <div className="border-t border-border pt-3 flex justify-between items-center">
            <span className="font-semibold text-text">Balance Due</span>
            <span className="text-2xl font-bold text-gold">{formatCurrency(balanceDue)}</span>
          </div>
        </div>

        {/* Payment Options */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-text">Choose Payment Method</h2>

          {/* Option A: ACH */}
          <div className={`card cursor-pointer transition-all duration-200 ${selected === 'ach' ? 'border-gold shadow-gold' : 'hover:border-gold/50'}`}
            onClick={() => setSelected(selected === 'ach' ? null : 'ach')}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-green-400/10 flex items-center justify-center flex-shrink-0">
                <Building2 size={20} className="text-green-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-text">Bank Transfer (ACH)</p>
                  <span className="badge bg-green-400/10 text-green-400 text-xs">✓ Recommended</span>
                </div>
                <p className="text-sm text-text-muted mt-0.5">Free for you — no extra fees</p>
                <p className="text-xs text-text-muted mt-1">Settlement: 3–5 business days</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-400">{formatCurrency(balanceDue)}</p>
                <p className="text-xs text-text-muted">No fees</p>
              </div>
            </div>
            {selected === 'ach' && (
              <div className="mt-4 pt-4 border-t border-border">
                <StripePaymentWrapper invoiceId={invoiceId!} amount={balanceDue} method="ach" onSuccess={() => setSuccess(true)} />
              </div>
            )}
          </div>

          {/* Option B: Card */}
          <div className={`card cursor-pointer transition-all duration-200 ${selected === 'card' ? 'border-gold shadow-gold' : 'hover:border-gold/50'}`}
            onClick={() => setSelected(selected === 'card' ? null : 'card')}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-400/10 flex items-center justify-center flex-shrink-0">
                <CreditCard size={20} className="text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-text">Credit or Debit Card</p>
                <p className="text-sm text-text-muted mt-0.5">3% processing fee applied</p>
                <p className="text-xs text-yellow-400/80 mt-1">⚠ Surcharge disclosed per Virginia regulations</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-blue-400">{formatCurrency(balanceDue * 1.03)}</p>
                <p className="text-xs text-text-muted">+3% fee</p>
              </div>
            </div>
            {selected === 'card' && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-input p-3 mb-4">
                  <p className="text-xs text-yellow-400">A 3% processing fee ({formatCurrency(balanceDue * 0.03)}) will be added to your payment total of {formatCurrency(balanceDue * 1.03)}. This surcharge is applied in accordance with applicable state regulations.</p>
                </div>
                <StripePaymentWrapper invoiceId={invoiceId!} amount={balanceDue} method="card" onSuccess={() => setSuccess(true)} />
              </div>
            )}
          </div>

          {/* Option C: Check */}
          <div className={`card cursor-pointer transition-all duration-200 ${selected === 'check' ? 'border-gold shadow-gold' : 'hover:border-gold/50'}`}
            onClick={() => setSelected(selected === 'check' ? null : 'check')}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                <Mail size={20} className="text-gold" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-text">Pay by Check</p>
                <p className="text-sm text-text-muted mt-0.5">No fees — mail or drop off</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gold">{formatCurrency(balanceDue)}</p>
                <p className="text-xs text-text-muted">No fees</p>
              </div>
            </div>
            {selected === 'check' && (
              <div className="mt-4 pt-4 border-t border-border text-sm space-y-2">
                <p className="text-text font-medium">Make check payable to:</p>
                <p className="text-gold font-bold text-base">Classic Glass & Stone Arts</p>
                {businessAddress && (
                  <>
                    <p className="text-text-muted text-xs mt-1">Mailing address:</p>
                    <p className="text-text">{businessAddress}</p>
                  </>
                )}
                {checkInstructions && (
                  <div className="bg-surface-2 rounded-input p-3 mt-2">
                    <p className="text-text-muted text-xs whitespace-pre-line">{checkInstructions}</p>
                  </div>
                )}
                <p className="text-text-muted text-xs pt-2">
                  Please include invoice #{invoice.invoice_number} in the memo line. Your invoice will be marked as paid upon receipt.
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-text-muted pb-8">
          Payments secured by Stripe • Classic Glass & Stone Arts
        </p>
      </div>
    </div>
  )
}
