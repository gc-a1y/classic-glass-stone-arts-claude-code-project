import { cn, STATUS_COLORS, STATUS_LABELS } from '../../lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn('badge', STATUS_COLORS[status] || 'text-text-muted bg-surface-2', className)}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}
