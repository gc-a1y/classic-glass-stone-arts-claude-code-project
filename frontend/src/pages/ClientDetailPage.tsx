import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, MapPin, DollarSign } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Client, Invoice, Estimate } from '../types'
import { formatCurrency, formatDate } from '../lib/utils'
import { Skeleton } from '../components/ui/Skeleton'
import StatusBadge from '../components/ui/StatusBadge'

export default function ClientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('invoices').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      supabase.from('estimates').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    ]).then(([{ data: c }, { data: inv }, { data: est }]) => {
      setClient(c as Client)
      setInvoices((inv || []) as Invoice[])
      setEstimates((est || []) as Estimate[])
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>
  if (!client) return <p className="text-text-muted p-6">Client not found.</p>

  const totalSpent = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)
  const outstanding = invoices.filter(i => ['sent', 'partially_paid', 'overdue'].includes(i.status)).reduce((s, i) => s + i.total, 0)

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/clients')} className="text-text-muted hover:text-text">
          <ArrowLeft size={20} />
        </button>
        <h1 className="page-title">{client.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className="card space-y-4">
          <h2 className="section-title">Contact Info</h2>
          {client.email && (
            <div className="flex items-center gap-3 text-sm">
              <Mail size={16} className="text-gold flex-shrink-0" />
              <a href={`mailto:${client.email}`} className="text-text hover:text-gold transition-colors">{client.email}</a>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-3 text-sm">
              <Phone size={16} className="text-gold flex-shrink-0" />
              <a href={`tel:${client.phone}`} className="text-text hover:text-gold transition-colors">{client.phone}</a>
            </div>
          )}
          {client.address && (
            <div className="flex items-start gap-3 text-sm">
              <MapPin size={16} className="text-gold flex-shrink-0 mt-0.5" />
              <p className="text-text">{client.address}</p>
            </div>
          )}
          <p className="text-xs text-text-muted">Client since {formatDate(client.created_at)}</p>
        </div>

        {/* Stats */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-gold" />
              <p className="text-xs text-text-muted uppercase tracking-wider">Total Spent</p>
            </div>
            <p className="text-2xl font-bold text-text mt-2">{formatCurrency(totalSpent)}</p>
            <p className="text-xs text-text-muted">{invoices.filter(i => i.status === 'paid').length} paid invoices</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-text-muted uppercase tracking-wider">Outstanding</p>
            <p className="text-2xl font-bold text-gold mt-2">{formatCurrency(outstanding)}</p>
            <p className="text-xs text-text-muted">{invoices.filter(i => ['sent', 'partially_paid', 'overdue'].includes(i.status)).length} open invoices</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-text-muted uppercase tracking-wider">Total Invoices</p>
            <p className="text-2xl font-bold text-text mt-2">{invoices.length}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-text-muted uppercase tracking-wider">Estimates</p>
            <p className="text-2xl font-bold text-text mt-2">{estimates.length}</p>
          </div>
        </div>
      </div>

      {/* Invoice History */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="section-title">Invoice History</h2>
          <Link to={`/invoices/new?client=${id}`} className="btn-primary text-sm py-1.5">+ New Invoice</Link>
        </div>
        {invoices.length === 0 ? (
          <p className="text-text-muted text-sm p-6 text-center">No invoices yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="table-header">Invoice #</th>
                  <th className="table-header">Total</th>
                  <th className="table-header">Due Date</th>
                  <th className="table-header">Status</th>
                  <th className="table-header"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="table-cell font-mono text-xs">{inv.invoice_number}</td>
                    <td className="table-cell font-semibold text-gold">{formatCurrency(inv.total)}</td>
                    <td className="table-cell text-text-muted">{formatDate(inv.due_date)}</td>
                    <td className="table-cell"><StatusBadge status={inv.status} /></td>
                    <td className="table-cell"><Link to={`/invoices/${inv.id}`} className="text-xs text-gold hover:text-gold-light">View →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Estimate History */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="section-title">Estimates</h2>
          <Link to={`/estimates/new?client=${id}`} className="btn-primary text-sm py-1.5">+ New Estimate</Link>
        </div>
        {estimates.length === 0 ? (
          <p className="text-text-muted text-sm p-6 text-center">No estimates yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="table-header">ID</th>
                  <th className="table-header">Total</th>
                  <th className="table-header">Created</th>
                  <th className="table-header">Status</th>
                  <th className="table-header"></th>
                </tr>
              </thead>
              <tbody>
                {estimates.map(est => (
                  <tr key={est.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="table-cell font-mono text-xs">EST-{est.id.slice(0, 6).toUpperCase()}</td>
                    <td className="table-cell font-semibold text-gold">{formatCurrency(est.total)}</td>
                    <td className="table-cell text-text-muted">{formatDate(est.created_at)}</td>
                    <td className="table-cell"><StatusBadge status={est.status} /></td>
                    <td className="table-cell"><Link to={`/estimates/${est.id}`} className="text-xs text-gold hover:text-gold-light">View →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
