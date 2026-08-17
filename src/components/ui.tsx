import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

// 상태 배지: 시맨틱 상태색 10%(라이트)/18%(다크) 배경 규칙은
// color-mix로 상태색 토큰에서 유도한다
const STATUS_COLOR: Record<string, string> = {
  done: 'var(--ok)',
  pending: 'var(--warn)',
  missing: 'var(--warn)',
  duplicate: 'var(--text-tertiary)',
  transcribing: 'var(--info)',
  diarizing: 'var(--info)',
  enriching: 'var(--info)',
  error: 'var(--error)',
}

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? 'var(--text-tertiary)'
  return (
    <span
      className="inline-flex h-5 items-center rounded-[6px] px-2 text-xs font-medium"
      style={{
        color,
        background: `color-mix(in srgb, ${color} var(--badge-alpha, 10%), transparent)`,
      }}
      data-status={status}
    >
      {status}
    </span>
  )
}

export function TagChip({ name }: { name: string }) {
  return (
    <span className="inline-flex h-[22px] items-center rounded-[6px] border border-border bg-bg px-2 text-xs text-text-secondary">
      {name}
    </span>
  )
}

export function EmptyState({
  icon: Icon,
  message,
  action,
}: {
  icon: LucideIcon
  message: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Icon size={24} strokeWidth={1.75} className="text-text-tertiary" />
      <p className="text-sm text-text-secondary">{message}</p>
      {action}
    </div>
  )
}

export function ErrorNote({ message }: { message: string }) {
  return <p className="py-4 text-sm text-error">{message}</p>
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex min-h-14 items-center border-b border-border px-4">
          <div className="h-4 w-2/5 animate-pulse rounded bg-border" />
        </div>
      ))}
    </div>
  )
}
