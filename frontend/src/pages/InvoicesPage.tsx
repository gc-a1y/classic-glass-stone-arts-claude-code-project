import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Receipt } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Invoice } from '../types'
import { formatCurrency, formatDate } from '../lib/utils'
import { SkeletonTable } from '../components/ui/Skeleton'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    supabase
      .from('invoices')
      .select('*, client:clients(name, email)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setInvoices((data || []) as unknown as Invoice[])
        setLoading(false)
      })
  }, [])

  const filtered = invoices.filter(inv => {
    const matchesSearch = search === '' ||
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.client as any)?.name?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="text-text-muted text-sm mt-0.5">{invoices.length} total invoices</p>
        </div>
        <Link to="/invoices/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          New Invoice
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input className="input pl-9" placeholder="Search by invoice # or client..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select sm:w-48" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6"><SkeletonTable /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No invoices yet"
            description="Create your first invoice or convert an estimate."
            action={{ label: 'Create Invoice', to: '/invoices/new' }}
          />
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-border">
              {filtered.map((inv) => (
                <Link
                  key={inv.id}
                  to={`/invoices/${inv.id}`}
                  className="flex items-start justify-between p-4 hover:bg-surface-2/60 active:bg-surface-2 transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-4 space-y-1">
                    <p className="font-mono text-[11px] font-medium text-text-muted tracking-wide">{inv.invoice_number}</p>
                    <p className="font-semibold text-text truncate">{(inv.client as any)?.name || '—'}</p>
                    <p className="text-xs text-text-muted">Due {formatDate(inv.due_date)}</p>
                  </div>
                  <div className="flex-shrink-0 text-right space-y-1.5">
                    <p className="font-bold text-gold text-base">{formatCurrency(inv.total)}</p>
                    <div className="flex justify-end"><StatusBadge status={inv.status} /></div>
                  </div>
                </Link>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr>
                    <th className="table-header">Invoice #</th>
                    <th className="table-header">Client</th>
                    <th className="table-header">Total</th>
                    <th className="table-header">Due Date</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr key={inv.id} className="hover:bg-surface-2/50 transition-colors">
                      <td className="table-cell font-mono text-xs font-medium text-text">{inv.invoice_number}</td>
                      <td className="table-cell font-medium">{(inv.client as any)?.name || '—'}</td>
                      <td className="table-cell font-semibold text-gold">{formatCurrency(inv.total)}</td>
                      <td className="table-cell text-text-muted">{formatDate(inv.due_date)}</td>
                      <td className="table-cell"><StatusBadge status={inv.status} /></td>
                      <td className="table-cell">
                        <Link to={`/invoices/${inv.id}`} className="text-xs text-gold hover:text-gold-light font-medium">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
