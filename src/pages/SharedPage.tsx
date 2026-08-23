import { Link } from 'react-router-dom'
import { Share2 } from 'lucide-react'
import { api } from '../api'
import { EmptyState, ErrorNote, ListSkeleton, StatusBadge, TagChip } from '../components/ui'
import { formatDate, formatDuration, withJosa } from '../format'
import { useAsync } from '../hooks'

/**
 * 워크스페이스 밖에서 나에게 열린 녹음들.
 *
 * 목록과 검색은 워크스페이스 필터만 걸어서, 이 화면이 없으면 공유받은 사람이 그 녹음에
 * 닿을 길이 없다.
 */
export default function SharedPage() {
  const query = useAsync(() => api.sharedWithMe(), [])

  return (
    <div className="px-6 py-6">
      <h2 className="text-2xl font-bold tracking-[-0.01em]">나에게 공유됨</h2>
      {query.error && <ErrorNote message={query.error} />}
      {query.loading && <ListSkeleton />}
      {query.data?.total === 0 && (
        <EmptyState icon={Share2} message="아직 공유받은 녹음이 없습니다" />
      )}
      <ul className="mt-4 flex flex-col">
        {(query.data?.items ?? []).map((item) => (
          <li key={item.id} className="border-b border-border">
            <Link
              to={`/recordings/${item.id}`}
              className="flex min-h-14 flex-col justify-center gap-1 px-4 py-3 hover:bg-bg"
            >
              <span className="text-lg text-text">{item.title ?? item.filename}</span>
              <span className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                <span className="tnum">{formatDate(item.recorded_at)}</span>
                <span className="tnum">{formatDuration(item.duration_sec)}</span>
                <StatusBadge status={item.status} progress={item.progress} />
                <span>
                  {item.shared_by ? `${withJosa(item.shared_by, '이', '가')} 공유` : '공유받음'}
                  {item.permission === 'edit' ? ' (편집 가능)' : ''}
                </span>
                {item.tags.map((tag) => (
                  <TagChip key={tag.id} name={tag.name} />
                ))}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
