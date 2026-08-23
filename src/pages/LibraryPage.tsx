import { useEffect, useRef, useState } from 'react'
import { useCan, useWorkspaceId } from '../workspace'
import { Link, useSearchParams } from 'react-router-dom'
import { FolderOpen, Upload, X } from 'lucide-react'
import { api, type RecordingSummary } from '../api'
import { useAsync } from '../hooks'
import { formatDate, formatDuration } from '../format'
import {
  EmptyState,
  ErrorNote,
  ListSkeleton,
  ProgressLine,
  StatusBadge,
  TagChip,
} from '../components/ui'
import { AUDIO_ACCEPT, DropOverlay, UploadList, useUpload } from '../components/Uploader'

const PAGE_SIZE = 50
const REFRESH_MS = 5000
// 이 상태들은 워커가 손대고 있으므로 화면을 주기적으로 새로고침한다
const ACTIVE_STATUSES = ['pending', 'transcribing', 'diarizing', 'enriching']

const STATUS_FILTERS = ['전체', 'pending', 'transcribing', 'diarizing', 'enriching', 'done', 'error', 'missing', 'duplicate']

export default function LibraryPage() {
  const workspaceId = useWorkspaceId()
  // 못 하는 일은 그리지 않는다. 비활성으로 남기면 왜 안 되는지 알 길이 없다
  const canUpload = useCan('upload')
  const [status, setStatus] = useState('전체')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [params, setParams] = useSearchParams()
  const tag = params.get('tag') ?? undefined
  const tagName = params.get('tagName') ?? undefined
  const uploads = useUpload()
  const query = useAsync(
    () => api.listRecordings(workspaceId, { status: status === '전체' ? undefined : status, tag, limit }),
    [workspaceId, status, tag, limit, uploads.completed],
  )
  const fileInput = useRef<HTMLInputElement | null>(null)
  const [dragging, setDragging] = useState(false)

  // 처리 중인 항목이 있을 때만 폴링한다 (전부 done이면 재조회할 이유가 없다)
  const hasActive = (query.data?.items ?? []).some((it) => ACTIVE_STATUSES.includes(it.status))
  const reload = query.reload
  useEffect(() => {
    if (!hasActive) return
    const timer = setInterval(reload, REFRESH_MS)
    return () => clearInterval(timer)
  }, [hasActive, reload])

  return (
    <div
      className="relative px-6 py-6"
      onDragEnter={(e) => {
        if (canUpload && e.dataTransfer.types.includes('Files')) setDragging(true)
      }}
      onDragOver={(e) => {
        if (canUpload && e.dataTransfer.types.includes('Files')) e.preventDefault()
      }}
      onDragLeave={(e) => {
        // 자식 사이 이동은 무시하고 컨테이너 밖으로 나갈 때만 끈다. 깊이를 세면
        // 드래그 도중 자식이 언마운트될 때 카운터가 새서 오버레이가 남는다
        const next = e.relatedTarget as Node | null
        if (!next || !e.currentTarget.contains(next)) setDragging(false)
      }}
      onDrop={(e) => {
        setDragging(false)
        if (!canUpload || !e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        uploads.add(e.dataTransfer.files)
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-[-0.01em]">라이브러리</h2>
        <div className="flex items-center gap-3">
          {query.data && (
            <span className="tnum text-sm text-text-secondary">{query.data.total}개</span>
          )}
          {canUpload && (
            <>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex h-9 items-center gap-2 rounded-[6px] bg-accent px-3.5 text-sm font-medium text-accent-text-on transition-colors duration-120 hover:bg-accent-hover"
              >
                <Upload size={18} strokeWidth={1.75} />
                업로드
              </button>
              <input
                ref={fileInput}
                type="file"
                multiple
                accept={AUDIO_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) uploads.add(e.target.files)
                  e.target.value = ''
                }}
              />
            </>
          )}
        </div>
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

      <UploadList />

      <div className="relative min-h-[240px]">
        <DropOverlay active={dragging} />
        {query.error && <ErrorNote message={query.error} />}
        {query.loading && !query.data && <ListSkeleton />}
        {query.data && query.data.items.length === 0 && (
          <EmptyState
            icon={FolderOpen}
            message="등록된 녹음이 없습니다. 파일을 끌어다 놓거나 업로드 버튼을 누르세요."
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
    </div>
  )
}

function Row({ item }: { item: RecordingSummary }) {
  return (
    <Link
      to={`/recordings/${item.id}`}
      className="flex min-h-14 flex-col justify-center gap-1 border-b border-border px-4 py-2 transition-colors duration-120 last:border-b-0 hover:bg-bg"
    >
      <span className="truncate text-lg font-semibold">{item.title ?? item.filename}</span>
      <span className="flex items-center gap-2 text-sm text-text-secondary">
        <span className="tnum">{formatDate(item.recorded_at)}</span>
        <span aria-hidden>·</span>
        <span className="tnum">{formatDuration(item.duration_sec)}</span>
        <StatusBadge status={item.status} progress={item.progress} />
        {item.tags.map((t) => (
          <TagChip key={t.id} name={t.name} />
        ))}
      </span>
      <ProgressLine progress={item.progress} etaSec={item.eta_sec} />
    </Link>
  )
}
