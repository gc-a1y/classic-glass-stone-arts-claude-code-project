import { format } from 'date-fns'

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatDateShort(date: string | Date): string {
  return format(new Date(date), 'MM/dd/yyyy')
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 9000) + 1000
  return `INV-${year}-${random}`
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export const STATUS_COLORS: Record<string, string> = {
  draft: 'text-text-muted bg-surface-2',
  sent: 'text-blue-400 bg-blue-400/10',
  partially_paid: 'text-yellow-400 bg-yellow-400/10',
  paid: 'text-green-400 bg-green-400/10',
  overdue: 'text-red-400 bg-red-400/10',
  accepted: 'text-green-400 bg-green-400/10',
  rejected: 'text-red-400 bg-red-400/10',
  converted: 'text-gold bg-gold/10',
  pending: 'text-yellow-400 bg-yellow-400/10',
  processing: 'text-blue-400 bg-blue-400/10',
  succeeded: 'text-green-400 bg-green-400/10',
  failed: 'text-red-400 bg-red-400/10',
}

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
  overdue: 'Overdue',
  accepted: 'Accepted',
  rejected: 'Rejected',
  converted: 'Converted',
  pending: 'Pending',
  processing: 'Processing',
  succeeded: 'Succeeded',
  failed: 'Failed',
}
