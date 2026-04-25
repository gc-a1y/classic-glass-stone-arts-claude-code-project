import { cn } from '../../lib/utils'

interface SkeletonProps {
  className?: string
  rows?: number
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

export function SkeletonCard({ rows = 3 }: SkeletonProps) {
  return (
    <div className="card space-y-3">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full" style={{ width: `${70 + Math.random() * 30}%` } as React.CSSProperties} />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  )
}

export function SkeletonStatCard() {
  return (
    <div className="stat-card">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-32 mt-1" />
      <Skeleton className="h-3 w-20 mt-1" />
    </div>
  )
}
