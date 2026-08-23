import { useEffect } from 'react'
import { useWorkspaceId } from '../workspace'
import { Link } from 'react-router-dom'
import { Activity } from 'lucide-react'
import { api } from '../api'
import { useAsync } from '../hooks'
import { formatDate, formatDuration, formatEta } from '../format'
import { EmptyState, ErrorNote, ListSkeleton, StatusBadge } from '../components/ui'
import { STATUSES } from '../status'

const REFRESH_MS = 5000


export default function DashboardPage() {
  const workspaceId = useWorkspaceId()
  const query = useAsync(() => api.stats(workspaceId), [workspaceId])

  useEffect(() => {
    const timer = setInterval(query.reload, REFRESH_MS)
    return () => clearInterval(timer)
  }, [query.reload])

  if (query.error) {
    return (
      <div className="px-6 py-6">
        <h2 className="mb-4 text-2xl font-bold tracking-[-0.01em]">대시보드</h2>
        <ErrorNote message={query.error} />
      </div>
    )
  }
  const stats = query.data
  if (!stats) {
    return query.loading ? (
      <div className="px-6 py-6">
        <h2 className="mb-4 text-2xl font-bold tracking-[-0.01em]">대시보드</h2>
        <ListSkeleton rows={3} />
      </div>
    ) : null
  }

  const counts = new Map(stats.by_status.map((s) => [s.status, s]))
  const totalCount = stats.by_status.reduce((acc, s) => acc + s.count, 0)

  return (
    <div className="px-6 py-6">
      <h2 className="mb-4 text-2xl font-bold tracking-[-0.01em]">대시보드</h2>

      {totalCount === 0 ? (
        <EmptyState icon={Activity} message="등록된 녹음이 없어 집계할 것이 없습니다." />
      ) : (
        <>
          <section className="mb-6 max-w-[720px] rounded-[10px] border border-border bg-surface p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-lg font-semibold">처리 진행률</h3>
              <span className="tnum text-sm text-text-secondary">
                오디오 기준 {Math.round(stats.done_ratio * 100)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${stats.done_ratio * 100}%` }}
              />
            </div>
            <div className="mt-3 flex gap-6 text-sm text-text-secondary">
              <span>
                처리 배속{' '}
                <span className="tnum font-medium text-text">
                  {stats.speed_ratio != null
                    ? `오디오 1분당 ${Math.round(stats.speed_ratio * 60)}초`
                    : '실측 전'}
                </span>
              </span>
              <span>
                남은 예상 시간{' '}
                <span className="tnum font-medium text-text">{formatEta(stats.eta_sec)}</span>
              </span>
            </div>
          </section>

          <section className="mb-6 grid max-w-[720px] grid-cols-4 gap-3">
            {STATUSES.filter((s) => counts.has(s)).map((status) => {
              const entry = counts.get(status)!
              return (
                <div
                  key={status}
                  className="rounded-[10px] border border-border bg-surface p-4"
                >
                  <StatusBadge status={status} />
                  <p className="tnum mt-2 text-xl font-[650]">{entry.count}</p>
                  <p className="tnum text-xs text-text-tertiary">
                    {formatDuration(entry.audio_sec)}
                  </p>
                </div>
              )
            })}
          </section>

          {stats.recent_errors.length > 0 && (
            <section className="max-w-[720px]">
              <h3 className="mb-2 text-lg font-semibold">최근 에러</h3>
              <div className="overflow-hidden rounded-[10px] border border-border bg-surface">
                {stats.recent_errors.map((rec) => (
                  <Link
                    key={rec.id}
                    to={`/recordings/${rec.id}`}
                    className="flex min-h-14 flex-col justify-center gap-1 border-b border-border px-4 py-2 transition-colors duration-120 last:border-b-0 hover:bg-bg"
                  >
                    <span className="truncate text-sm font-medium">
                      {rec.title ?? rec.filename}
                    </span>
                    <span className="tnum text-xs text-text-tertiary">
                      {formatDate(rec.recorded_at)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
