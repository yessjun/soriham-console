import { memo, useCallback, useMemo, useState } from 'react'
import type { Segment } from '../api'
import { formatDuration } from '../format'
import { usePlayerControls, usePlayerTime, type PlayerTrack } from '../player-context'

type RenameFn = (speakerKey: string, name: string) => Promise<void>

type Props = {
  segments: Segment[]
  speakerNames: Record<string, string>
  track: PlayerTrack
  /** 검색에서 넘어온 자리. 재생 중이 아닐 때만 강조한다 */
  focusIdx?: number
  /** 없으면 화자 이름을 고칠 수 없다. 그때는 버튼으로 그리지 않는다 */
  onRename?: RenameFn
  /** 링크가 화자 이름을 막았으면 라벨만 남는다 */
  showSpeakerNames?: boolean
  /** 링크가 오디오를 막았으면 눌러서 듣는 어포던스를 그리지 않는다 */
  playable?: boolean
}

/**
 * 전사 뷰. 재생 시간을 여기서만 구독한다.
 *
 * 세그먼트를 memo로 감싸 두면 시간이 바뀌어도 활성 표시가 뒤집히는 두 개만 다시
 * 그린다. 예전에는 초당 네 번 수천 개가 통째로 다시 그려졌다.
 */
export function Transcript({
  segments,
  speakerNames,
  track,
  focusIdx,
  onRename,
  showSpeakerNames = true,
  playable = true,
}: Props) {
  const { play, track: playing } = usePlayerControls()
  const { currentTime } = usePlayerTime()
  const isCurrent = playing?.recordingId === track.recordingId

  const speakerOrder = useMemo(
    () => [...new Set(segments.map((s) => s.speaker_key).filter(Boolean))] as string[],
    [segments],
  )

  const colorOf = useCallback(
    (key: string | null) => {
      if (!key) return undefined
      const i = speakerOrder.indexOf(key)
      return i >= 0 ? `var(--speaker-${(i % 8) + 1})` : undefined
    },
    [speakerOrder],
  )

  const labelOf = useCallback(
    (key: string | null) => {
      if (!key) return '화자 미상'
      return showSpeakerNames ? (speakerNames[key] ?? key) : key
    },
    [speakerNames, showSpeakerNames],
  )

  // 자식이 memo로 걸러지려면 이 함수들이 매번 새로 만들어지면 안 된다
  const playAt = useCallback(
    (sec: number) => (playable ? play(track, sec) : undefined),
    [play, track, playable],
  )

  const activeIdx = useMemo(() => {
    if (!isCurrent) return focusIdx ?? -1
    return segments.find((s) => currentTime >= s.start_sec && currentTime < s.end_sec)?.idx ?? -1
  }, [isCurrent, currentTime, segments, focusIdx])

  if (segments.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-secondary">
        아직 전사 결과가 없습니다. 변환이 끝나면 표시됩니다.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {segments.map((seg) =>
        seg.kind === 'noise' ? (
          <NoiseMark key={seg.idx} seg={seg} onPlay={playAt} playable={playable} />
        ) : (
          <SegmentView
            key={seg.idx}
            seg={seg}
            color={colorOf(seg.speaker_key)}
            label={labelOf(seg.speaker_key)}
            active={seg.idx === activeIdx}
            onPlay={playAt}
            playable={playable}
            onRename={onRename}
          />
        ),
      )}
    </div>
  )
}

const NoiseMark = memo(function NoiseMark({
  seg,
  onPlay,
  playable,
}: {
  seg: Segment
  onPlay: (sec: number) => void
  playable: boolean
}) {
  const range = `${formatDuration(seg.start_sec)} ~ ${formatDuration(seg.end_sec)}`
  if (!playable) {
    return (
      <div
        id={`seg-${seg.idx}`}
        className="flex items-center gap-2 border-l-[3px] border-border py-1 pl-3 text-sm text-text-tertiary"
      >
        <span className="tnum text-xs">{range}</span>
        <span>받아적지 못한 구간</span>
      </div>
    )
  }
  return (
    <button
      type="button"
      id={`seg-${seg.idx}`}
      onClick={() => onPlay(seg.start_sec)}
      title="이 구간부터 재생"
      className="flex w-full items-center gap-2 border-l-[3px] border-border py-1 pl-3 text-left text-sm text-text-tertiary transition-colors duration-120 hover:text-accent"
    >
      <span className="tnum text-xs">{range}</span>
      <span>받아적지 못한 구간, 눌러서 듣기</span>
    </button>
  )
})

const SegmentView = memo(function SegmentView({
  seg,
  color,
  label,
  active,
  onPlay,
  playable,
  onRename,
}: {
  seg: Segment
  color: string | undefined
  label: string
  active: boolean
  onPlay: (sec: number) => void
  playable: boolean
  onRename?: RenameFn
}) {
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(label)
  const canRename = onRename !== undefined && seg.speaker_key !== null

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
        {renaming && canRename ? (
          <input
            autoFocus
            aria-label="화자 이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return
              if (e.key === 'Enter' && name.trim()) {
                void onRename(seg.speaker_key!, name.trim()).then(() => setRenaming(false))
              }
              if (e.key === 'Escape') setRenaming(false)
            }}
            onBlur={() => setRenaming(false)}
            className="h-6 w-32 rounded-[6px] border border-border-strong bg-surface px-2 text-sm"
          />
        ) : canRename ? (
          <button
            type="button"
            title="화자 이름 수정"
            onClick={() => {
              setName(label)
              setRenaming(true)
            }}
            className="text-sm font-semibold"
            style={{ color: color ?? 'var(--text-secondary)' }}
          >
            {label}
          </button>
        ) : (
          // 고칠 수 없으면 버튼으로 그리지 않는다. 눌러도 아무 일이 없으면
          // 무엇이 잘못됐는지 알 길이 없다
          <span className="text-sm font-semibold" style={{ color: color ?? 'var(--text-secondary)' }}>
            {label}
          </span>
        )}
        {playable ? (
          <button
            type="button"
            onClick={() => onPlay(seg.start_sec)}
            title="이 구간부터 재생"
            className="tnum text-xs text-text-tertiary hover:text-accent"
          >
            {formatDuration(seg.start_sec)}
          </button>
        ) : (
          // 들을 수 없는 링크에서 눌러도 아무 일이 없으면 무엇이 잘못됐는지 알 수 없다
          <span className="tnum text-xs text-text-tertiary">{formatDuration(seg.start_sec)}</span>
        )}
      </div>
      <p className="text-base">{seg.text}</p>
    </div>
  )
})
