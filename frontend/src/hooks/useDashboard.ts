import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DashboardStats, RecentActivity } from '../types'

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

        const [invoicesRes, estimatesRes, leadsRes, paymentsRes, recentInvoicesRes, recentLeadsRes] = await Promise.all([
          supabase.from('invoices').select('total, status, created_at, client_id').neq('status', 'draft'),
          supabase.from('estimates').select('id, status').eq('status', 'sent'),
          supabase.from('leads').select('id').gte('created_at', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()),
          supabase.from('payments').select('amount, created_at').eq('status', 'succeeded').gte('created_at', startOfMonth),
          supabase.from('invoices').select('id, invoice_number, total, status, client_id, created_at').order('created_at', { ascending: false }).limit(3),
          supabase.from('leads').select('id, name, created_at').order('created_at', { ascending: false }).limit(2),
        ])

        const revenueMTD = (paymentsRes.data || []).reduce((sum, p) => sum + (p.amount || 0), 0)
        const outstanding = (invoicesRes.data || [])
          .filter(i => ['sent', 'partially_paid', 'overdue'].includes(i.status))
          .reduce((sum, i) => sum + (i.total || 0), 0)

        // Revenue by month (last 6)
        const { data: allPayments } = await supabase
          .from('payments')
          .select('amount, created_at')
          .eq('status', 'succeeded')
          .gte('created_at', new Date(Date.now() - 180 * 24 * 3600 * 1000).toISOString())

        const monthlyRevenue: Record<string, number> = {}
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const key = d.toLocaleString('default', { month: 'short', year: '2-digit' })
          monthlyRevenue[key] = 0
        }
        ;(allPayments || []).forEach(p => {
          const d = new Date(p.created_at)
          const key = d.toLocaleString('default', { month: 'short', year: '2-digit' })
          if (key in monthlyRevenue) monthlyRevenue[key] += p.amount || 0
        })

        // Recent activity
        const activity: RecentActivity[] = [
          ...(recentInvoicesRes.data || []).map(inv => ({
            id: inv.id,
            type: 'invoice' as const,
            description: `Invoice ${inv.invoice_number} — ${inv.status}`,
            amount: inv.total,
            created_at: inv.created_at,
          })),
          ...(recentLeadsRes.data || []).map(lead => ({
            id: lead.id,
            type: 'lead' as const,
            description: `New lead: ${lead.name}`,
            created_at: lead.created_at,
          })),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)

        setStats({
          revenue_mtd: revenueMTD,
          outstanding_invoices: outstanding,
          estimates_pending: (estimatesRes.data || []).length,
          new_leads: (leadsRes.data || []).length,
          revenue_by_month: Object.entries(monthlyRevenue).map(([month, revenue]) => ({ month, revenue })),
          recent_activity: activity,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return { stats, loading }
}
