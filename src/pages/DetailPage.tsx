import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Check, Pencil, Plus, X } from 'lucide-react'
import { api, type RecordingDetail, type Segment } from '../api'
import { useAsync } from '../hooks'
import { formatDate, formatDuration } from '../format'
import { ErrorNote, ListSkeleton, ProgressLine, StatusBadge, TagChip } from '../components/ui'
import { usePlayer } from '../player'

export default function DetailPage() {
  const { id } = useParams<{ id: string }>()
  const query = useAsync(() => api.recording(id!), [id])

  if (query.error) return <ErrorNote message={query.error} />
  if (!query.data) return query.loading ? <ListSkeleton /> : null
  return <Detail key={query.data.id} initial={query.data} />
}

function Detail({ initial }: { initial: RecordingDetail }) {
  const [rec, setRec] = useState(initial)
  const player = usePlayer()
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

  const speakerOrder = [...new Set(rec.segments.map((s) => s.speaker_key).filter(Boolean))] as string[]
  const speakerColor = (key: string | null): string | undefined => {
    if (!key) return undefined
    const i = speakerOrder.indexOf(key)
    return i >= 0 ? `var(--speaker-${(i % 8) + 1})` : undefined
  }
  const speakerLabel = (key: string | null): string =>
    key ? (rec.speaker_names[key] ?? key) : '화자 미상'

  const track = { recordingId: rec.id, title: rec.title ?? rec.filename }
  const isCurrent = player.track?.recordingId === rec.id

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
        {rec.segments.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-secondary">
            아직 전사 결과가 없습니다. 변환이 끝나면 표시됩니다.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {rec.segments.map((seg) =>
              seg.kind === 'noise' ? (
                <NoiseMark
                  key={seg.idx}
                  seg={seg}
                  onPlay={() => player.play(track, seg.start_sec)}
                />
              ) : (
              <SegmentView
                key={seg.idx}
                seg={seg}
                color={speakerColor(seg.speaker_key)}
                label={speakerLabel(seg.speaker_key)}
                active={
                  (isCurrent &&
                    player.currentTime >= seg.start_sec &&
                    player.currentTime < seg.end_sec) ||
                  (!isCurrent && seg.idx === focusIdx)
                }
                onPlay={() => player.play(track, seg.start_sec)}
                onRename={
                  seg.speaker_key
                    ? async (name: string) => {
                        await api.renameSpeaker(rec.id, seg.speaker_key!, name)
                        setRec({
                          ...rec,
                          speaker_names: { ...rec.speaker_names, [seg.speaker_key!]: name },
                        })
                      }
                    : undefined
                }
              />
              ),
            )}
          </div>
        )}
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

function SegmentView({
  seg,
  color,
  label,
  active,
  onPlay,
  onRename,
}: {
  seg: Segment
  color: string | undefined
  label: string
  active: boolean
  onPlay: () => void
  onRename?: (name: string) => Promise<void>
}) {
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(label)

  return (
    <div
      id={`seg-${seg.idx}`}
      className="border-l-[3px] py-1 pl-3 transition-colors duration-120"
      style={{
        borderLeftColor: color ?? 'var(--border)',
        background: active ? 'var(--accent-subtle)' : undefined,
      }}
    >
      <div className="flex items-baseline gap-2">
        {renaming && onRename ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return
              if (e.key === 'Enter' && name.trim()) {
                void onRename(name.trim()).then(() => setRenaming(false))
              }
              if (e.key === 'Escape') setRenaming(false)
            }}
            onBlur={() => setRenaming(false)}
            className="h-6 w-32 rounded-[6px] border border-border-strong bg-surface px-2 text-sm"
          />
        ) : (
          <button
            type="button"
            title={onRename ? '화자 이름 수정' : undefined}
            onClick={() => {
              if (onRename) {
                setName(label)
                setRenaming(true)
              }
            }}
            className="text-sm font-semibold"
            style={{ color: color ?? 'var(--text-secondary)' }}
          >
            {label}
          </button>
        )}
        <button
          type="button"
          onClick={onPlay}
          title="이 구간부터 재생"
          className="tnum text-xs text-text-tertiary hover:text-accent"
        >
          {formatDuration(seg.start_sec)}
        </button>
      </div>
      <p className="text-base">{seg.text}</p>
    </div>
  )
}

/**
 * 받아적지 못한 구간. 소리가 없었다는 뜻이 아니라 쓸 만한 텍스트를 못 얻었다는 뜻이다.
 * 사람이 들으면 알아들을 수 있는 말이 섞여 있어서 눌러 들을 수 있게 둔다.
 */
function NoiseMark({ seg, onPlay }: { seg: Segment; onPlay: () => void }) {
  return (
    <button
      type="button"
      id={`seg-${seg.idx}`}
      onClick={onPlay}
      title="이 구간부터 재생"
      className="flex w-full items-center gap-2 border-l-[3px] border-border py-1 pl-3 text-left text-sm text-text-tertiary transition-colors duration-120 hover:text-accent"
    >
      <span className="tnum text-xs">
        {formatDuration(seg.start_sec)} ~ {formatDuration(seg.end_sec)}
      </span>
      <span>받아적지 못한 구간 · 눌러서 듣기</span>
    </button>
  )
}
