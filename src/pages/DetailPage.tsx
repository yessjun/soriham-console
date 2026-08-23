import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Check, Pencil, Plus, X } from 'lucide-react'
import { api, type RecordingDetail } from '../api'
import { useAsync } from '../hooks'
import { formatDate, formatDuration } from '../format'
import { ErrorNote, ListSkeleton, ProgressLine, StatusBadge, TagChip } from '../components/ui'
import { Transcript } from '../components/Transcript'

export default function DetailPage() {
  const { id } = useParams<{ id: string }>()
  const query = useAsync(() => api.recording(id!), [id])

  if (query.error) return <ErrorNote message={query.error} />
  if (!query.data) return query.loading ? <ListSkeleton /> : null
  return <Detail key={query.data.id} initial={query.data} />
}

function Detail({ initial }: { initial: RecordingDetail }) {
  const [rec, setRec] = useState(initial)
  const [params] = useSearchParams()

  // 검색 히트에서 넘어온 경우(?t=초) 해당 세그먼트로 스크롤
  const tParam = params.get('t')
  const focusIdx =
    tParam != null
      ? (rec.segments.find(
          (s) => s.start_sec <= Number(tParam) && Number(tParam) < s.end_sec,
        )?.idx ??
        rec.segments.find((s) => s.start_sec >= Number(tParam))?.idx ??
        null)
      : null

  useEffect(() => {
    if (focusIdx == null) return
    document
      .getElementById(`seg-${focusIdx}`)
      ?.scrollIntoView({ block: 'center' })
  }, [focusIdx])

  const track = { recordingId: rec.id, title: rec.title ?? rec.filename }

  return (
    <div className="mx-auto max-w-[720px] px-6 py-6">
      <TitleEditor rec={rec} onSaved={setRec} />
      <div className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
        <span className="tnum">{formatDate(rec.recorded_at)}</span>
        <span aria-hidden>·</span>
        <span className="tnum">{formatDuration(rec.duration_sec)}</span>
        <StatusBadge status={rec.status} progress={rec.progress} />
        {rec.language && <span>{rec.language}</span>}
        <ProgressLine progress={rec.progress} etaSec={rec.eta_sec} />
      </div>
      {rec.title && (
        <p className="mt-1 font-mono text-xs text-text-tertiary">{rec.filename}</p>
      )}
      {rec.error && <ErrorNote message={rec.error} />}
      {rec.summary && (
        <p className="mt-4 rounded-[10px] border border-border bg-surface p-4 text-base">
          {rec.summary}
        </p>
      )}

      <TagEditor rec={rec} onChanged={(tags) => setRec({ ...rec, tags })} />

      <section className="mt-6">
        <Transcript
          segments={rec.segments}
          speakerNames={rec.speaker_names}
          track={track}
          focusIdx={focusIdx ?? undefined}
          onRename={
            rec.can_edit
              ? async (speakerKey, name) => {
                  await api.renameSpeaker(rec.id, speakerKey, name)
                  setRec({ ...rec, speaker_names: { ...rec.speaker_names, [speakerKey]: name } })
                }
              : undefined
          }
        />
      </section>
    </div>
  )
}

function TitleEditor({
  rec,
  onSaved,
}: {
  rec: RecordingDetail
  onSaved: (rec: RecordingDetail) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(rec.title ?? '')
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    try {
      await api.updateTitle(rec.id, value.trim())
      onSaved({ ...rec, title: value.trim() || null })
      setEditing(false)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (!editing) {
    return (
      <div className="group flex items-center gap-2">
        <h2 className="text-xl font-[650]">{rec.title ?? rec.filename}</h2>
        <button
          type="button"
          aria-label="제목 수정"
          onClick={() => setEditing(true)}
          className="rounded-[6px] p-1 text-text-tertiary opacity-0 transition-opacity duration-120 group-hover:opacity-100 hover:bg-bg focus-visible:opacity-100"
        >
          <Pencil size={18} strokeWidth={1.75} />
        </button>
      </div>
    )
  }
  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return
            if (e.key === 'Enter') void save()
            if (e.key === 'Escape') setEditing(false)
          }}
          placeholder={rec.filename}
          className="h-9 flex-1 rounded-[6px] border border-border-strong bg-surface px-3 text-base"
        />
        <button
          type="button"
          aria-label="저장"
          onClick={() => void save()}
          className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-accent text-accent-text-on hover:bg-accent-hover"
        >
          <Check size={18} strokeWidth={1.75} />
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-error">{error}</p>}
    </div>
  )
}

function TagEditor({
  rec,
  onChanged,
}: {
  rec: RecordingDetail
  onChanged: (tags: RecordingDetail['tags']) => void
}) {
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const add = async () => {
    const name = value.trim()
    if (!name) return
    try {
      onChanged(await api.addTag(rec.id, name))
      setValue('')
      setAdding(false)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        {rec.tags.map((t) => (
          <span key={t.id} className="group inline-flex items-center">
            <TagChip name={t.name} />
            <button
              type="button"
              aria-label={`태그 ${t.name} 제거`}
              onClick={() => void api.removeTag(rec.id, t.id).then(onChanged)}
              className="ml-1 rounded-[6px] p-1 text-text-tertiary opacity-0 transition-opacity duration-120 group-hover:opacity-100 hover:text-error focus-visible:opacity-100"
            >
              <X size={12} strokeWidth={1.75} />
            </button>
          </span>
        ))}
        {adding ? (
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return
              if (e.key === 'Enter') void add()
              if (e.key === 'Escape') setAdding(false)
            }}
            onBlur={() => setAdding(false)}
            placeholder="태그 이름"
            className="h-[22px] w-28 rounded-[6px] border border-border-strong bg-surface px-2 text-xs"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex h-[22px] items-center gap-1 rounded-[6px] border border-dashed border-border-strong px-2 text-xs text-text-secondary hover:bg-bg"
          >
            <Plus size={12} strokeWidth={1.75} />
            태그
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-error">{error}</p>}
    </div>
  )
}
