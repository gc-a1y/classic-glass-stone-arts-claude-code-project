export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue'
export type EstimateStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted'
export type PaymentMethod = 'ach' | 'card' | 'check'
export type LeadSource = 'website' | 'referral' | 'phone' | 'bella_ai' | 'other'

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  address: string
  created_at: string
  archived?: boolean
}

export interface LineItem {
  id: string
  material_type: 'glass' | 'stone' | 'vinyl' | 'mirror' | 'custom'
  description: string
  quantity: number
  unit: string
  unit_price: number
  total: number
}

export interface Estimate {
  id: string
  client_id: string
  client?: Client
  line_items: LineItem[]
  subtotal: number
  tax: number
  tax_rate: number
  labor: number
  total: number
  margin: number
  status: EstimateStatus
  notes?: string
  created_at: string
  updated_at?: string
}

export interface Invoice {
  id: string
  estimate_id?: string
  client_id: string
  client?: Client
  invoice_number: string
  line_items: LineItem[]
  subtotal: number
  tax: number
  tax_rate: number
  total: number
  amount_paid: number
  status: InvoiceStatus
  due_date: string
  paid_at?: string
  payment_method?: PaymentMethod
  notes?: string
  created_at: string
  updated_at?: string
}

export interface Payment {
  id: string
  invoice_id: string
  amount: number
  method: PaymentMethod
  stripe_payment_intent_id?: string
  status: 'pending' | 'processing' | 'succeeded' | 'failed'
  created_at: string
}

export interface Lead {
  id: string
  name: string
  email: string
  phone: string
  project_description: string
  source: LeadSource
  created_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface ChatSession {
  id: string
  lead_id?: string
  messages: ChatMessage[]
  created_at: string
}

export interface Setting {
  id: string
  key: string
  value: string
}

export interface DashboardStats {
  revenue_mtd: number
  outstanding_invoices: number
  estimates_pending: number
  new_leads: number
  revenue_by_month: { month: string; revenue: number }[]
  recent_activity: RecentActivity[]
}

export interface RecentActivity {
  id: string
  type: 'invoice' | 'payment' | 'lead' | 'estimate'
  description: string
  amount?: number
  created_at: string
}
