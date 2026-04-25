import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Plus, Trash2, Save, Send, ArrowLeft, Download, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import api from '../lib/api'
import { Estimate, LineItem, Client } from '../types'
import { formatCurrency, generateId } from '../lib/utils'
import StatusBadge from '../components/ui/StatusBadge'
import { Skeleton } from '../components/ui/Skeleton'
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

const DEFAULT_TAX_RATE = 6

export default function EstimateDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([DEFAULT_LINE_ITEM()])
  const [taxRate, setTaxRate] = useState(DEFAULT_TAX_RATE)
  const [labor, setLabor] = useState(0)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<Estimate['status']>('draft')
  const [showMargin, setShowMargin] = useState(false)
  const [marginPercent, setMarginPercent] = useState(30)
  const [estimate, setEstimate] = useState<Estimate | null>(null)

  useEffect(() => {
    supabase.from('clients').select('id, name, email').eq('archived', false).order('name')
      .then(({ data }) => setClients((data || []) as Client[]))
  }, [])

  useEffect(() => {
    if (!isNew && id) {
      supabase.from('estimates').select('*, client:clients(*)').eq('id', id).single()
        .then(({ data }) => {
          if (data) {
            setEstimate(data as unknown as Estimate)
            setClientId(data.client_id)
            setLineItems(data.line_items as LineItem[])
            setTaxRate(data.tax_rate || DEFAULT_TAX_RATE)
            setLabor(data.labor || 0)
            setNotes(data.notes || '')
            setStatus(data.status as Estimate['status'])
          }
          setLoading(false)
        })
    }
  }, [id, isNew])

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount + labor
  const margin = total * (marginPercent / 100)
  const costBasis = total - margin

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

  const save = useCallback(async (newStatus?: Estimate['status']) => {
    if (!clientId) { toast.error('Please select a client'); return }
    setSaving(true)
    const s = newStatus || status
    const payload = {
      client_id: clientId,
      line_items: lineItems,
      subtotal,
      tax: taxAmount,
      tax_rate: taxRate,
      labor,
      total,
      margin: marginPercent,
      status: s,
      notes,
      updated_at: new Date().toISOString(),
    }
    try {
      if (isNew) {
        const { data, error } = await supabase.from('estimates').insert({ ...payload, created_at: new Date().toISOString() }).select().single()
        if (error) throw error
        toast.success('Estimate created!')
        navigate(`/estimates/${data.id}`, { replace: true })
      } else {
        const { error } = await supabase.from('estimates').update(payload).eq('id', id!)
        if (error) throw error
        setStatus(s)
        toast.success(newStatus === 'sent' ? 'Estimate marked as sent!' : 'Estimate saved!')
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to save estimate')
    } finally {
      setSaving(false)
    }
  }, [clientId, lineItems, subtotal, taxAmount, taxRate, labor, total, marginPercent, status, notes, isNew, id, navigate])

  const convertToInvoice = async () => {
    if (!estimate) return
    setSaving(true)
    try {
      const invNum = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`
      const dueDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0]
      const { data, error } = await supabase.from('invoices').insert({
        estimate_id: estimate.id,
        client_id: estimate.client_id,
        invoice_number: invNum,
        line_items: estimate.line_items,
        subtotal: estimate.subtotal,
        tax: estimate.tax,
        tax_rate: estimate.tax_rate,
        total: estimate.total,
        amount_paid: 0,
        status: 'draft',
        due_date: dueDate,
        notes: estimate.notes,
        created_at: new Date().toISOString(),
      }).select().single()
      if (error) throw error
      await supabase.from('estimates').update({ status: 'converted' }).eq('id', estimate.id)
      toast.success('Converted to invoice!')
      navigate(`/invoices/${data.id}`)
    } catch (e: any) {
      toast.error(e.message || 'Failed to convert')
    } finally {
      setSaving(false)
    }
  }

  const downloadPDF = async () => {
    try {
      const res = await api.get(`/api/estimates/${id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `estimate-${id?.slice(0, 6)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('PDF generation requires the backend server')
    }
  }

  if (loading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={() => navigate('/estimates')} className="text-text-muted hover:text-text">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="page-title">{isNew ? 'New Estimate' : `Estimate — EST-${id?.slice(0, 6).toUpperCase()}`}</h1>
          {!isNew && <StatusBadge status={status} className="mt-1" />}
        </div>
        <div className="flex gap-2 flex-wrap">
          {!isNew && (
            <>
              <button onClick={downloadPDF} className="btn-secondary flex items-center gap-2 text-sm">
                <Download size={15} /> PDF
              </button>
              {status !== 'converted' && (
                <button onClick={convertToInvoice} disabled={saving} className="btn-secondary flex items-center gap-2 text-sm">
                  <RefreshCw size={15} /> Convert to Invoice
                </button>
              )}
              {status === 'draft' && (
                <button onClick={() => save('sent')} disabled={saving} className="btn-secondary flex items-center gap-2 text-sm">
                  <Send size={15} /> Mark Sent
                </button>
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
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client */}
          <div className="card">
            <h2 className="section-title mb-4">Client</h2>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="label">Select Client</label>
                <select className="select" value={clientId} onChange={e => setClientId(e.target.value)}>
                  <option value="">— Choose a client —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <Link to="/clients" className="btn-ghost text-sm mb-0.5">+ New Client</Link>
            </div>
          </div>

          {/* Line Items */}
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="section-title">Line Items</h2>
              <button
                onClick={() => setLineItems(prev => [...prev, DEFAULT_LINE_ITEM()])}
                className="btn-secondary flex items-center gap-1.5 text-sm py-1.5"
              >
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
                        <select
                          className="select text-xs py-1.5 capitalize"
                          value={item.material_type}
                          onChange={e => updateLineItem(i, 'material_type', e.target.value)}
                        >
                          {MATERIAL_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          className="input text-xs py-1.5"
                          placeholder="Description..."
                          value={item.description}
                          onChange={e => updateLineItem(i, 'description', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number" min="0"
                          className="input text-xs py-1.5 w-20"
                          value={item.quantity}
                          onChange={e => updateLineItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          className="input text-xs py-1.5 w-20"
                          value={item.unit}
                          onChange={e => updateLineItem(i, 'unit', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number" min="0" step="0.01"
                          className="input text-xs py-1.5 w-28"
                          value={item.unit_price}
                          onChange={e => updateLineItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="px-4 py-2 font-semibold text-sm text-gold">{formatCurrency(item.total)}</td>
                      <td className="px-4 py-2">
                        {lineItems.length > 1 && (
                          <button
                            onClick={() => setLineItems(prev => prev.filter((_, idx) => idx !== i))}
                            className="text-text-muted hover:text-red-400 transition-colors"
                          >
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

          {/* Notes */}
          <div className="card">
            <label className="label">Notes (Internal)</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Add internal notes about this estimate..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="section-title mb-4">Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Subtotal</span>
                <span className="text-text">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm gap-2">
                <span className="text-text-muted">Tax</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0" max="100" step="0.1"
                    className="input text-xs py-1 w-16 text-right"
                    value={taxRate}
                    onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-text-muted text-xs">%</span>
                  <span className="text-text">{formatCurrency(taxAmount)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm gap-2">
                <span className="text-text-muted">Labor</span>
                <input
                  type="number" min="0" step="0.01"
                  className="input text-xs py-1 w-28 text-right"
                  value={labor}
                  onChange={e => setLabor(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="font-semibold text-text">Total</span>
                <span className="font-bold text-xl text-gold">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Margin Calculator (internal) */}
          <div className="card border-border/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text">Profit Margin</h3>
              <button onClick={() => setShowMargin(v => !v)} className="text-xs text-text-muted hover:text-text">
                {showMargin ? 'Hide' : 'Show'}
              </button>
            </div>
            {showMargin && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <label className="text-text-muted flex-1">Margin %</label>
                  <input
                    type="number" min="0" max="100"
                    className="input text-xs py-1 w-20 text-right"
                    value={marginPercent}
                    onChange={e => setMarginPercent(parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-text-muted text-xs">%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Profit</span>
                  <span className="text-green-400">{formatCurrency(margin)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Cost Basis</span>
                  <span className="text-text">{formatCurrency(costBasis)}</span>
                </div>
                <p className="text-xs text-text-muted italic">Internal only — not shown to client</p>
              </div>
            )}
          </div>

          {!isNew && estimate && (
            <div className="card">
              <h3 className="text-sm font-semibold text-text mb-3">Share</h3>
              <div className="bg-surface-2 rounded-input p-2 break-all">
                <p className="text-xs text-text-muted font-mono">{window.location.origin}/estimates/{id}/view</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/estimates/${id}/view`)
                  toast.success('Link copied!')
                }}
                className="btn-secondary w-full mt-2 text-sm"
              >
                Copy Shareable Link
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
