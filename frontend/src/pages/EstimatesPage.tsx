import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Estimate } from '../types'
import { formatCurrency, formatDate } from '../lib/utils'
import { SkeletonTable } from '../components/ui/Skeleton'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'

export default function EstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    supabase
      .from('estimates')
      .select('*, client:clients(name, email)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setEstimates((data || []) as unknown as Estimate[])
        setLoading(false)
      })
  }, [])

  const filtered = estimates.filter(e => {
    const matchesSearch = search === '' ||
      (e.client as any)?.name?.toLowerCase().includes(search.toLowerCase()) ||
      e.id.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Estimates</h1>
          <p className="text-text-muted text-sm mt-0.5">{estimates.length} total estimates</p>
        </div>
        <Link to="/estimates/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          New Estimate
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            className="input pl-9"
            placeholder="Search by client name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="select sm:w-44"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="converted">Converted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6"><SkeletonTable /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No estimates yet"
            description="Create your first estimate to get started with a client project."
            action={{ label: 'Create Estimate', to: '/estimates/new' }}
          />
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-border">
              {filtered.map((e) => (
                <Link
                  key={e.id}
                  to={`/estimates/${e.id}`}
                  className="flex items-start justify-between p-4 hover:bg-surface-2/60 active:bg-surface-2 transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-4 space-y-1">
                    <p className="font-mono text-[11px] font-medium text-text-muted tracking-wide">EST-{e.id.slice(0, 6).toUpperCase()}</p>
                    <p className="font-semibold text-text truncate">{(e.client as any)?.name || '—'}</p>
                    <p className="text-xs text-text-muted">{formatDate(e.created_at)}</p>
                  </div>
                  <div className="flex-shrink-0 text-right space-y-1.5">
                    <p className="font-bold text-gold text-base">{formatCurrency(e.total)}</p>
                    <div className="flex justify-end"><StatusBadge status={e.status} /></div>
                  </div>
                </Link>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr>
                    <th className="table-header">ID</th>
                    <th className="table-header">Client</th>
                    <th className="table-header">Total</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Created</th>
                    <th className="table-header">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id} className="hover:bg-surface-2/50 transition-colors">
                      <td className="table-cell">
                        <span className="font-mono text-xs text-text-muted">EST-{e.id.slice(0, 6).toUpperCase()}</span>
                      </td>
                      <td className="table-cell font-medium">{(e.client as any)?.name || '—'}</td>
                      <td className="table-cell font-semibold text-gold">{formatCurrency(e.total)}</td>
                      <td className="table-cell"><StatusBadge status={e.status} /></td>
                      <td className="table-cell text-text-muted">{formatDate(e.created_at)}</td>
                      <td className="table-cell">
                        <Link to={`/estimates/${e.id}`} className="text-xs text-gold hover:text-gold-light font-medium">
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
