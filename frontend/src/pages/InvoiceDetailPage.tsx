import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Plus, Trash2, Save, Send, ArrowLeft, Download, DollarSign, Mail, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import api from '../lib/api'
import { Invoice, LineItem, Client } from '../types'
import { formatCurrency, formatDate, generateInvoiceNumber, generateId } from '../lib/utils'
import StatusBadge from '../components/ui/StatusBadge'
import { Skeleton } from '../components/ui/Skeleton'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'

const MATERIAL_TYPES = ['glass', 'stone', 'vinyl', 'mirror', 'custom'] as const
const DEFAULT_LINE_ITEM = (): LineItem => ({
  id: generateId(),
  material_type: 'glass',
  description: '',
  quantity: 1,
  unit: 'sqft',
  unit_price: 0,
  total: 0,
})

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [clientId, setClientId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState(generateInvoiceNumber())
  const [lineItems, setLineItems] = useState<LineItem[]>([DEFAULT_LINE_ITEM()])
  const [taxRate, setTaxRate] = useState(6)
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(Date.now() + 30 * 24 * 3600 * 1000)
    return d.toISOString().split('T')[0]
  })
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<Invoice['status']>('draft')
  const [markPaidModal, setMarkPaidModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'ach' | 'card' | 'check'>('check')

  useEffect(() => {
    supabase.from('clients').select('id, name, email').eq('archived', false).order('name')
      .then(({ data }) => setClients((data || []) as Client[]))
  }, [])

  useEffect(() => {
    if (!isNew && id) {
      supabase.from('invoices').select('*, client:clients(*)').eq('id', id).single()
        .then(({ data }) => {
          if (data) {
            const inv = data as unknown as Invoice
            setInvoice(inv)
            setClientId(inv.client_id)
            setInvoiceNumber(inv.invoice_number)
            setLineItems(inv.line_items as LineItem[])
            setTaxRate(inv.tax_rate || 6)
            setDueDate(inv.due_date.split('T')[0])
            setNotes(inv.notes || '')
            setStatus(inv.status)
          }
          setLoading(false)
        })
    }
  }, [id, isNew])

  const subtotal = lineItems.reduce((s, i) => s + i.total, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setLineItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      if (field === 'quantity' || field === 'unit_price') {
        const q = field === 'quantity' ? Number(value) : updated[index].quantity
        const p = field === 'unit_price' ? Number(value) : updated[index].unit_price
        updated[index].total = q * p
      }
      return updated
    })
  }

  const save = useCallback(async (newStatus?: Invoice['status']) => {
    if (!clientId) { toast.error('Please select a client'); return }
    setSaving(true)
    const s = newStatus || status
    const payload = {
      client_id: clientId,
      invoice_number: invoiceNumber,
      line_items: lineItems,
      subtotal,
      tax: taxAmount,
      tax_rate: taxRate,
      total,
      amount_paid: invoice?.amount_paid || 0,
      status: s,
      due_date: dueDate,
      notes,
      updated_at: new Date().toISOString(),
    }
    try {
      if (isNew) {
        const { data, error } = await supabase.from('invoices').insert({ ...payload, created_at: new Date().toISOString() }).select().single()
        if (error) throw error
        toast.success('Invoice created!')
        navigate(`/invoices/${data.id}`, { replace: true })
      } else {
        const { error } = await supabase.from('invoices').update(payload).eq('id', id!)
        if (error) throw error
        setStatus(s)
        toast.success(newStatus === 'sent' ? 'Invoice marked as sent!' : 'Invoice saved!')
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to save invoice')
    } finally {
      setSaving(false)
    }
  }, [clientId, invoiceNumber, lineItems, subtotal, taxAmount, taxRate, total, dueDate, notes, status, isNew, id, navigate, invoice])

  const sendEmail = async () => {
    setSaving(true)
    try {
      await api.post(`/api/invoices/${id}/send-email`)
      await save('sent')
      toast.success('Invoice sent via email!')
    } catch {
      toast.error('Email failed — check backend SendGrid config')
    } finally {
      setSaving(false)
    }
  }

  const markAsPaid = async () => {
    setSaving(true)
    try {
      await supabase.from('invoices').update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: paymentMethod,
      }).eq('id', id!)
      setStatus('paid')
      setMarkPaidModal(false)
      toast.success('Invoice marked as paid!')
    } catch {
      toast.error('Failed to update invoice')
    } finally {
      setSaving(false)
    }
  }

  const downloadPDF = async () => {
    try {
      const res = await api.get(`/api/invoices/${id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${invoiceNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('PDF generation requires the backend server')
    }
  }

  if (loading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>

  const paymentLink = `${window.location.origin}/pay/${id}`

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={() => navigate('/invoices')} className="text-text-muted hover:text-text">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="page-title">{isNew ? 'New Invoice' : invoiceNumber}</h1>
          {!isNew && <StatusBadge status={status} className="mt-1" />}
        </div>
        <div className="flex gap-2 flex-wrap">
          {!isNew && (
            <>
              <button onClick={downloadPDF} className="btn-secondary flex items-center gap-2 text-sm">
                <Download size={15} /> PDF
              </button>
              {status !== 'paid' && (
                <>
                  <button onClick={sendEmail} disabled={saving} className="btn-secondary flex items-center gap-2 text-sm">
                    <Mail size={15} /> Send Email
                  </button>
                  <button onClick={() => setMarkPaidModal(true)} className="btn-secondary flex items-center gap-2 text-sm text-green-600 border-green-200 hover:border-green-500 hover:text-green-600">
                    <CheckCircle size={15} /> Mark Paid
                  </button>
                </>
              )}
            </>
          )}
          <button onClick={() => save()} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
            {saving ? <div className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> : <Save size={15} />}
            Save
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Client + Invoice # */}
          <div className="card">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Client</label>
                <select className="select" value={clientId} onChange={e => setClientId(e.target.value)}>
                  <option value="">— Select client —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Invoice Number</label>
                <input className="input" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
              </div>
              <div>
                <label className="label">Due Date</label>
                <input type="date" className="input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="section-title">Line Items</h2>
              <button onClick={() => setLineItems(prev => [...prev, DEFAULT_LINE_ITEM()])} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5">
                <Plus size={15} /> Add Item
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr>
                    <th className="table-header">Material</th>
                    <th className="table-header">Description</th>
                    <th className="table-header w-20">Qty</th>
                    <th className="table-header w-20">Unit</th>
                    <th className="table-header w-28">Unit Price</th>
                    <th className="table-header w-28">Total</th>
                    <th className="table-header w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2">
                        <select className="select text-xs py-1.5 capitalize" value={item.material_type} onChange={e => updateLineItem(i, 'material_type', e.target.value)}>
                          {MATERIAL_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2"><input className="input text-xs py-1.5" placeholder="Description..." value={item.description} onChange={e => updateLineItem(i, 'description', e.target.value)} /></td>
                      <td className="px-4 py-2"><input type="number" min="0" className="input text-xs py-1.5 w-20" value={item.quantity} onChange={e => updateLineItem(i, 'quantity', parseFloat(e.target.value) || 0)} /></td>
                      <td className="px-4 py-2"><input className="input text-xs py-1.5 w-20" value={item.unit} onChange={e => updateLineItem(i, 'unit', e.target.value)} /></td>
                      <td className="px-4 py-2"><input type="number" min="0" step="0.01" className="input text-xs py-1.5 w-28" value={item.unit_price} onChange={e => updateLineItem(i, 'unit_price', parseFloat(e.target.value) || 0)} /></td>
                      <td className="px-4 py-2 font-semibold text-sm text-gold">{formatCurrency(item.total)}</td>
                      <td className="px-4 py-2">
                        {lineItems.length > 1 && (
                          <button onClick={() => setLineItems(prev => prev.filter((_, idx) => idx !== i))} className="text-text-muted hover:text-red-400 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={3} placeholder="Add notes visible to client..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="section-title mb-4">Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm gap-2">
                <span className="text-text-muted">Tax</span>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" max="100" step="0.1" className="input text-xs py-1 w-16 text-right" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} />
                  <span className="text-text-muted text-xs">%</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="font-semibold">Total Due</span>
                <span className="font-bold text-xl text-gold">{formatCurrency(total)}</span>
              </div>
              {invoice && invoice.amount_paid > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Paid</span>
                    <span className="text-green-400">{formatCurrency(invoice.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Balance Due</span>
                    <span className="text-gold">{formatCurrency(invoice.total - invoice.amount_paid)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {!isNew && (
            <div className="card">
              <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
                <DollarSign size={16} className="text-gold" />
                Payment Link
              </h3>
              <div className="bg-surface-2 rounded-input p-2 break-all mb-2">
                <p className="text-xs text-text-muted font-mono">{paymentLink}</p>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(paymentLink); toast.success('Payment link copied!') }} className="btn-secondary w-full text-sm">
                Copy Payment Link
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mark Paid Modal */}
      <Modal open={markPaidModal} onClose={() => setMarkPaidModal(false)} title="Mark Invoice as Paid" size="sm">
        <div className="p-6 space-y-4">
          <p className="text-sm text-text-muted">Select the payment method used to settle this invoice.</p>
          <div>
            <label className="label">Payment Method</label>
            <select className="select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)}>
              <option value="check">Check</option>
              <option value="ach">ACH / Bank Transfer</option>
              <option value="card">Credit/Debit Card</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setMarkPaidModal(false)} className="btn-ghost text-sm">Cancel</button>
            <button onClick={markAsPaid} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> : <CheckCircle size={15} />}
              Confirm Paid
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
