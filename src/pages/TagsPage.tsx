import { Link } from 'react-router-dom'
import { Tags } from 'lucide-react'
import { api } from '../api'
import { useAsync } from '../hooks'
import { EmptyState, ErrorNote } from '../components/ui'

export default function TagsPage() {
  const query = useAsync(() => api.tags(), [])

  return (
    <div className="px-6 py-6">
      <h2 className="mb-4 text-2xl font-bold tracking-[-0.01em]">태그</h2>
      {query.error && <ErrorNote message={query.error} />}
      {query.data && query.data.length === 0 && (
        <EmptyState
          icon={Tags}
          message="태그가 없습니다. 녹음 상세 화면에서 태그를 붙일 수 있습니다."
        />
      )}
      {query.data && query.data.length > 0 && (
        <div className="flex max-w-[720px] flex-wrap gap-2">
          {query.data.map((tag) => (
            <Link
              key={tag.id}
              to={`/?tag=${tag.id}&tagName=${encodeURIComponent(tag.name)}`}
              className="inline-flex h-8 items-center rounded-[6px] border border-border bg-surface px-3 text-sm text-text transition-colors duration-120 hover:bg-bg"
            >
              {tag.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
