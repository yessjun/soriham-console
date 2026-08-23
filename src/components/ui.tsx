import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { formatEta } from '../format'
import { STATUS_COLOR, statusLabel } from '../status'

// 상태 배지: 시맨틱 상태색 10%(라이트)/18%(다크) 배경 규칙은
// color-mix로 상태색 토큰에서 유도한다

export function StatusBadge({ status, progress }: { status: string; progress?: number | null }) {
  const color = STATUS_COLOR[status] ?? 'var(--text-tertiary)'
  const label = statusLabel(status)
  const pct = progress == null ? null : Math.round(progress * 100)
  return (
    <span
      className="inline-flex h-5 items-center rounded-[6px] px-2 text-xs font-medium"
      style={{
        color,
        background: `color-mix(in srgb, ${color} var(--badge-alpha, 10%), transparent)`,
      }}
      data-status={status}
    >
      {pct == null ? label : `${label} ${pct}%`}
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
  return (
    <p role="alert" className="py-4 text-sm text-error">
      {message}
    </p>
  )
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

/** 처리 중인 녹음의 진행 바와 남은 시간 */
export function ProgressLine({
  progress,
  etaSec,
}: {
  progress: number | null
  etaSec: number | null
}) {
  if (progress == null) return null
  return (
    <span className="flex items-center gap-2">
      <span className="h-1 w-40 rounded-[6px] bg-border">
        <span
          className="block h-full rounded-[6px] bg-accent transition-[width] duration-120"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </span>
      {etaSec != null && (
        <span className="tnum text-xs text-text-tertiary">약 {formatEta(etaSec)} 남음</span>
      )}
    </span>
  )
}
