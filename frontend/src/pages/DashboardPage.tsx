import { Link } from 'react-router-dom'
import { DollarSign, FileText, Clock, Users, Plus, ArrowRight, TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Area, AreaChart
} from 'recharts'
import { useDashboard } from '../hooks/useDashboard'
import { SkeletonStatCard, Skeleton } from '../components/ui/Skeleton'
import { formatCurrency, formatDate } from '../lib/utils'

function StatCard({ label, value, sub, icon: Icon, loading }: {
  label: string; value: string; sub?: string; icon: typeof DollarSign; loading?: boolean
}) {
  if (loading) return <SkeletonStatCard />
  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest leading-tight">{label}</p>
        <div className="w-9 h-9 rounded-input bg-gold/[0.08] flex items-center justify-center flex-shrink-0 group-hover:bg-gold/[0.14] transition-colors">
          <Icon size={16} className="text-gold" />
        </div>
      </div>
      <p className="text-[28px] font-bold text-text leading-none tracking-tight">{value}</p>
      {sub && <p className="text-xs text-text-muted mt-1.5">{sub}</p>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface border border-border rounded-input px-3 py-2 shadow-gold">
        <p className="text-xs text-text-muted mb-1">{label}</p>
        <p className="text-sm font-semibold text-gold">{formatCurrency(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

export default function DashboardPage() {
  const { stats, loading } = useDashboard()

  const activityIcon: Record<string, string> = {
    invoice: '🧾',
    payment: '💳',
    lead: '👤',
    estimate: '📋',
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-text-muted text-sm mt-0.5">Welcome back to your business portal</p>
        </div>
        <div className="hidden sm:flex gap-2">
          <Link to="/estimates/new" className="btn-secondary flex items-center gap-2 text-sm">
            <Plus size={16} />
            New Estimate
          </Link>
          <Link to="/invoices/new" className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} />
            New Invoice
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Revenue MTD"
          value={loading ? '—' : formatCurrency(stats?.revenue_mtd || 0)}
          sub="This month"
          icon={DollarSign}
          loading={loading}
        />
        <StatCard
          label="Outstanding"
          value={loading ? '—' : formatCurrency(stats?.outstanding_invoices || 0)}
          sub="Unpaid invoices"
          icon={TrendingUp}
          loading={loading}
        />
        <StatCard
          label="Estimates"
          value={loading ? '—' : String(stats?.estimates_pending || 0)}
          sub="Awaiting response"
          icon={FileText}
          loading={loading}
        />
        <StatCard
          label="New Leads"
          value={loading ? '—' : String(stats?.new_leads || 0)}
          sub="Last 30 days"
          icon={Users}
          loading={loading}
        />
      </div>

      {/* Revenue Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="section-title">Revenue — Last 6 Months</h2>
          <Link to="/analytics" className="text-xs text-gold hover:text-gold-light flex items-center gap-1">
            View Analytics <ArrowRight size={12} />
          </Link>
        </div>
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats?.revenue_by_month || []} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E2DC" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#6B6560', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B6560', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#C9A84C" strokeWidth={2} fill="url(#revenueGrad)" dot={{ fill: '#C9A84C', r: 4 }} activeDot={{ r: 6, fill: '#E0BF6F' }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Recent Activity</h2>
            <Link to="/invoices" className="text-xs text-gold hover:text-gold-light flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (stats?.recent_activity || []).length === 0 ? (
            <p className="text-text-muted text-sm py-4 text-center">No recent activity</p>
          ) : (
            <div className="space-y-1">
              {(stats?.recent_activity || []).map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-input hover:bg-surface-2 transition-colors">
                  <span className="text-lg">{activityIcon[item.type] || '•'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text truncate">{item.description}</p>
                    <p className="text-xs text-text-muted">{formatDate(item.created_at)}</p>
                  </div>
                  {item.amount != null && (
                    <span className="text-sm font-semibold text-gold flex-shrink-0">{formatCurrency(item.amount)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="section-title mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/estimates/new" className="flex flex-col items-center gap-2 p-4 rounded-input bg-surface-2 border border-border hover:border-gold hover:shadow-gold transition-all duration-200 group">
              <FileText size={24} className="text-gold" />
              <span className="text-xs font-medium text-text text-center">New Estimate</span>
            </Link>
            <Link to="/invoices/new" className="flex flex-col items-center gap-2 p-4 rounded-input bg-surface-2 border border-border hover:border-gold hover:shadow-gold transition-all duration-200 group">
              <Clock size={24} className="text-gold" />
              <span className="text-xs font-medium text-text text-center">New Invoice</span>
            </Link>
            <Link to="/clients" className="flex flex-col items-center gap-2 p-4 rounded-input bg-surface-2 border border-border hover:border-gold hover:shadow-gold transition-all duration-200 group">
              <Users size={24} className="text-gold" />
              <span className="text-xs font-medium text-text text-center">View Clients</span>
            </Link>
            <Link to="/analytics" className="flex flex-col items-center gap-2 p-4 rounded-input bg-surface-2 border border-border hover:border-gold hover:shadow-gold transition-all duration-200 group">
              <TrendingUp size={24} className="text-gold" />
              <span className="text-xs font-medium text-text text-center">Analytics</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
