import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useWorkspaceId } from '../workspace'
import { Link } from 'react-router-dom'
import { Search, SearchX } from 'lucide-react'
import { api, type SearchHit } from '../api'
import { useAsync } from '../hooks'
import { formatDate, formatDuration } from '../format'
import { EmptyState, ErrorNote, ListSkeleton, StatusBadge } from '../components/ui'

export default function SearchPage() {
  const workspaceId = useWorkspaceId()
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  // 300ms 디바운스
  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), 300)
    return () => clearTimeout(timer)
  }, [input])

  useEffect(() => inputRef.current?.focus(), [])

  const result = useAsync(
    () => (query ? api.search(workspaceId, query) : Promise.resolve({ hits: [] as SearchHit[] })),
    [workspaceId, query],
  )

  return (
    <div className="px-6 py-6">
      <h2 className="mb-4 text-2xl font-bold tracking-[-0.01em]">검색</h2>
      <div className="relative mb-6 max-w-[560px]">
        <Search
          size={18}
          strokeWidth={1.75}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-tertiary"
        />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          type="search"
          aria-label="검색어"
          placeholder="녹취록, 파일명, 제목, 요약에서 검색"
          className="h-9 w-full rounded-[6px] border border-border-strong bg-surface pr-3 pl-10 text-base"
        />
      </div>

      {result.error && <ErrorNote message={result.error} />}
      {result.loading && <ListSkeleton rows={4} />}
      {query && result.data && result.data.hits.length === 0 && !result.loading && (
        <EmptyState icon={SearchX} message={`"${query}"에 대한 결과가 없습니다.`} />
      )}
      {result.data && result.data.hits.length > 0 && (
        <div className="overflow-hidden rounded-[10px] border border-border bg-surface">
          {result.data.hits.map((hit, i) => (
            <HitRow key={i} hit={hit} query={query} />
          ))}
        </div>
      )}
    </div>
  )
}

function HitRow({ hit, query }: { hit: SearchHit; query: string }) {
  const rec = hit.recording
  const to = hit.segment
    ? `/recordings/${rec.id}?t=${hit.segment.start_sec}`
    : `/recordings/${rec.id}`
  return (
    <Link
      to={to}
      className="flex min-h-14 flex-col justify-center gap-1 border-b border-border px-4 py-2 transition-colors duration-120 last:border-b-0 hover:bg-bg"
    >
      <span className="flex items-center gap-2 text-sm text-text-secondary">
        <span className="truncate font-medium text-text">
          {highlight(rec.title ?? rec.filename, query)}
        </span>
        <span className="tnum shrink-0">{formatDate(rec.recorded_at)}</span>
        <StatusBadge status={rec.status} />
      </span>
      {hit.segment && (
        <span className="flex items-baseline gap-2">
          <span className="tnum shrink-0 text-xs text-text-tertiary">
            {formatDuration(hit.segment.start_sec)}
          </span>
          <span className="line-clamp-2 text-base">{highlight(hit.segment.text, query)}</span>
        </span>
      )}
      {!hit.segment && rec.summary && (
        <span className="line-clamp-2 text-sm text-text-secondary">
          {highlight(rec.summary, query)}
        </span>
      )}
    </Link>
  )
}

/** 대소문자 무시 부분 일치 하이라이트 */
export function highlight(text: string, query: string): ReactNode {
  if (!query) return text
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  const parts: ReactNode[] = []
  let cursor = 0
  for (let at = lower.indexOf(q); at >= 0; at = lower.indexOf(q, at + q.length)) {
    if (at > cursor) parts.push(text.slice(cursor, at))
    parts.push(<mark key={at}>{text.slice(at, at + q.length)}</mark>)
    cursor = at + q.length
  }
  if (cursor === 0) return text
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}
