import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FolderOpen, X } from 'lucide-react'
import { api, type RecordingSummary } from '../api'
import { useAsync } from '../hooks'
import { formatDate, formatDuration } from '../format'
import { EmptyState, ErrorNote, ListSkeleton, StatusBadge, TagChip } from '../components/ui'

const PAGE_SIZE = 50

const STATUS_FILTERS = ['전체', 'pending', 'transcribing', 'enriching', 'done', 'error', 'missing']

export default function LibraryPage() {
  const [status, setStatus] = useState('전체')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [params, setParams] = useSearchParams()
  const tag = params.get('tag') ?? undefined
  const tagName = params.get('tagName') ?? undefined
  const query = useAsync(
    () => api.listRecordings({ status: status === '전체' ? undefined : status, tag, limit }),
    [status, tag, limit],
  )

  return (
    <div className="px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-[-0.01em]">라이브러리</h2>
        {query.data && (
          <span className="tnum text-sm text-text-secondary">{query.data.total}개</span>
        )}
      </div>
      {tag && (
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setParams({})}
            className="inline-flex h-8 items-center gap-1 rounded-[6px] bg-accent-subtle px-3 text-sm font-medium text-accent"
          >
            태그: {tagName ?? '선택됨'}
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>
      )}
      <div className="mb-4 flex gap-1">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStatus(s)
              setLimit(PAGE_SIZE)
            }}
            className={`h-8 rounded-[6px] px-3 text-sm transition-colors duration-120 ${
              status === s
                ? 'bg-accent-subtle font-medium text-accent'
                : 'text-text-secondary hover:bg-surface'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {query.error && <ErrorNote message={query.error} />}
      {query.loading && !query.data && <ListSkeleton />}
      {query.data && query.data.items.length === 0 && (
        <EmptyState
          icon={FolderOpen}
          message="등록된 녹음이 없습니다. 녹음 폴더 스캔 후 표시됩니다."
        />
      )}
      {query.data && query.data.items.length > 0 && (
        <div className="overflow-hidden rounded-[10px] border border-border bg-surface">
          {query.data.items.map((item) => (
            <Row key={item.id} item={item} />
          ))}
        </div>
      )}
      {query.data && query.data.items.length < query.data.total && (
        <div className="flex justify-center py-4">
          <button
            type="button"
            onClick={() => setLimit((l) => l + PAGE_SIZE)}
            className="h-8 rounded-[6px] border border-border-strong bg-surface px-3 text-sm text-text hover:bg-bg"
          >
            더 보기
          </button>
        </div>
      )}
    </div>
  )
}

function Row({ item }: { item: RecordingSummary }) {
  return (
    <Link
      to={`/recordings/${item.id}`}
      className="flex min-h-14 flex-col justify-center gap-0.5 border-b border-border px-4 py-2 transition-colors duration-120 last:border-b-0 hover:bg-bg"
    >
      <span className="truncate text-lg font-semibold">{item.title ?? item.filename}</span>
      <span className="flex items-center gap-2 text-sm text-text-secondary">
        <span className="tnum">{formatDate(item.recorded_at)}</span>
        <span aria-hidden>·</span>
        <span className="tnum">{formatDuration(item.duration_sec)}</span>
        <StatusBadge status={item.status} />
        {item.tags.map((t) => (
          <TagChip key={t.id} name={t.name} />
        ))}
      </span>
    </Link>
  )
}
