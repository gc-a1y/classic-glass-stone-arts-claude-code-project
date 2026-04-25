import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/utils'
import { Skeleton } from '../components/ui/Skeleton'

interface AnalyticsData {
  revenueByMonth: { month: string; revenue: number }[]
  paymentBreakdown: { name: string; value: number; color: string }[]
  topClients: { name: string; total: number }[]
  avgJobSize: number
  outstandingRatio: number
  totalCollected: number
  totalOutstanding: number
}

const CHART_TOOLTIP_STYLE = {
  contentStyle: { background: '#111111', border: '1px solid #2A2A2A', borderRadius: '8px', color: '#F5F5F5', fontSize: '12px' },
  labelStyle: { color: '#888888' },
}

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-surface border border-border rounded-input px-3 py-2 shadow-gold">
        <p className="text-xs text-text-muted mb-1">{label}</p>
        <p className="text-sm font-semibold text-gold">{formatCurrency(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAnalytics() {
      const now = new Date()

      // Revenue by month (last 12)
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, method, created_at')
        .eq('status', 'succeeded')
        .gte('created_at', new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString())

      const monthlyRevenue: Record<string, number> = {}
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        monthlyRevenue[d.toLocaleString('default', { month: 'short', year: '2-digit' })] = 0
      }
      ;(payments || []).forEach(p => {
        const key = new Date(p.created_at).toLocaleString('default', { month: 'short', year: '2-digit' })
        if (key in monthlyRevenue) monthlyRevenue[key] += p.amount || 0
      })

      // Payment method breakdown
      const methodCounts: Record<string, number> = { ach: 0, card: 0, check: 0 }
      ;(payments || []).forEach(p => {
        if (p.method in methodCounts) methodCounts[p.method] += p.amount || 0
      })

      // Also get check payments from invoices
      const { data: checkInvoices } = await supabase
        .from('invoices')
        .select('total, payment_method')
        .eq('status', 'paid')
        .eq('payment_method', 'check')
      ;(checkInvoices || []).forEach(inv => { methodCounts.check += inv.total || 0 })

      // Top clients
      const { data: paidInvoices } = await supabase
        .from('invoices')
        .select('total, client:clients(name)')
        .eq('status', 'paid')

      const clientRevenue: Record<string, number> = {}
      ;(paidInvoices || []).forEach(inv => {
        const name = (inv.client as any)?.name || 'Unknown'
        clientRevenue[name] = (clientRevenue[name] || 0) + (inv.total || 0)
      })
      const topClients = Object.entries(clientRevenue)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)

      // Outstanding vs collected
      const { data: allInvoices } = await supabase.from('invoices').select('total, status').neq('status', 'draft')
      const totalCollected = (allInvoices || []).filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)
      const totalOutstanding = (allInvoices || []).filter(i => ['sent', 'partially_paid', 'overdue'].includes(i.status)).reduce((s, i) => s + i.total, 0)
      const avgJobSize = allInvoices?.length ? (allInvoices.reduce((s, i) => s + i.total, 0) / allInvoices.length) : 0

      setData({
        revenueByMonth: Object.entries(monthlyRevenue).map(([month, revenue]) => ({ month, revenue })),
        paymentBreakdown: [
          { name: 'ACH / Bank', value: methodCounts.ach, color: '#22c55e' },
          { name: 'Card', value: methodCounts.card, color: '#3b82f6' },
          { name: 'Check', value: methodCounts.check, color: '#B8973A' },
        ].filter(d => d.value > 0),
        topClients,
        avgJobSize,
        outstandingRatio: totalCollected + totalOutstanding > 0 ? totalCollected / (totalCollected + totalOutstanding) : 0,
        totalCollected,
        totalOutstanding,
      })
      setLoading(false)
    }
    fetchAnalytics()
  }, [])

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="page-title">Analytics</h1>
        <p className="text-text-muted text-sm mt-0.5">Business performance overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [1,2,3,4].map(i => <div key={i} className="stat-card"><Skeleton className="h-16 w-full" /></div>)
        ) : (
          <>
            <div className="stat-card">
              <p className="text-xs text-text-muted uppercase tracking-wider">Total Collected</p>
              <p className="text-2xl font-bold text-green-400 mt-2">{formatCurrency(data?.totalCollected || 0)}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs text-text-muted uppercase tracking-wider">Outstanding</p>
              <p className="text-2xl font-bold text-yellow-400 mt-2">{formatCurrency(data?.totalOutstanding || 0)}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs text-text-muted uppercase tracking-wider">Avg Job Size</p>
              <p className="text-2xl font-bold text-text mt-2">{formatCurrency(data?.avgJobSize || 0)}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs text-text-muted uppercase tracking-wider">Collection Rate</p>
              <p className="text-2xl font-bold text-gold mt-2">{((data?.outstandingRatio || 0) * 100).toFixed(0)}%</p>
            </div>
          </>
        )}
      </div>

      {/* Revenue by Month */}
      <div className="card">
        <h2 className="section-title mb-6">Revenue by Month (Last 12)</h2>
        {loading ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={224}>
            <BarChart data={data?.revenueByMonth || []} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#888888', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#888888', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar dataKey="revenue" fill="#B8973A" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Method Breakdown */}
        <div className="card">
          <h2 className="section-title mb-4">Payment Method Breakdown</h2>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (data?.paymentBreakdown || []).length === 0 ? (
            <p className="text-text-muted text-sm text-center py-12">No payment data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data?.paymentBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {(data?.paymentBreakdown || []).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => <span style={{ color: '#888888', fontSize: '12px' }}>{value}</span>}
                  iconType="circle"
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  {...CHART_TOOLTIP_STYLE}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Clients */}
        <div className="card">
          <h2 className="section-title mb-4">Top Clients by Revenue</h2>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (data?.topClients || []).length === 0 ? (
            <p className="text-text-muted text-sm text-center py-12">No client data yet</p>
          ) : (
            <div className="space-y-3">
              {(data?.topClients || []).map((client, i) => {
                const maxTotal = data!.topClients[0].total
                const pct = (client.total / maxTotal) * 100
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-text font-medium truncate mr-2">{client.name}</span>
                      <span className="text-gold font-semibold flex-shrink-0">{formatCurrency(client.total)}</span>
                    </div>
                    <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                      <div className="h-full bg-gold rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
