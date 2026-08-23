import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Pause, Play, RotateCcw, RotateCw } from 'lucide-react'
import { api } from './api'
import {
  PlayerControlsContext,
  PlayerPlayingContext,
  PlayerTimeContext,
  usePlayerControls,
  usePlayerPlaying,
  usePlayerTime,
  type PlayerTrack,
} from './player-context'
import { formatDuration } from './format'

export type { PlayerTrack } from './player-context'
export {
  usePlayerControls,
  usePlayerPlaying,
  usePlayerTime,
} from './player-context'

const RATES = [1, 1.25, 1.5, 2]

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const trackIdRef = useRef<string | null>(null)
  const rateRef = useRef(1)
  const [track, setTrack] = useState<PlayerTrack | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [rate, setRateState] = useState(1)

  const audio = useCallback(() => {
    if (!audioRef.current) {
      const el = new Audio()
      el.preload = 'metadata'
      el.addEventListener('timeupdate', () => setCurrentTime(el.currentTime))
      el.addEventListener('durationchange', () => setDuration(el.duration || 0))
      el.addEventListener('play', () => setPlaying(true))
      el.addEventListener('pause', () => setPlaying(false))
      el.addEventListener('ended', () => setPlaying(false))
      audioRef.current = el
    }
    return audioRef.current
  }, [])

  const play = useCallback(
    (next: PlayerTrack, atSec?: number) => {
      const el = audio()
      // src 교체는 상태 업데이터 밖에서(부수효과 시점 보장) ref로 판별한다
      if (trackIdRef.current !== next.recordingId) {
        trackIdRef.current = next.recordingId
        el.src = next.src ?? api.audioUrl(next.recordingId)
        // 새 소스 로드가 재생 위치·시간을 리셋하므로 화면 상태도 즉시 리셋
        setCurrentTime(atSec ?? 0)
        setDuration(0)
        // 일부 브라우저는 소스 교체 시 playbackRate를 1로 되돌린다
        el.playbackRate = rateRef.current
      }
      setTrack(next)
      if (atSec != null) el.currentTime = atSec
      void el.play()
    },
    [audio],
  )

  const seek = useCallback(
    (sec: number) => {
      const el = audio()
      el.currentTime = sec
      setCurrentTime(sec)
    },
    [audio],
  )

  const toggle = useCallback(() => {
    const el = audio()
    if (el.paused) void el.play()
    else el.pause()
  }, [audio])

  const setRate = useCallback(
    (next: number) => {
      audio().playbackRate = next
      rateRef.current = next
      setRateState(next)
    },
    [audio],
  )

  useEffect(() => () => audioRef.current?.pause(), [])

  // 세 갈래로 나눈다. 한 덩어리로 두면 재생 시간이 바뀔 때마다 재생 시간을 안 보는
  // 컴포넌트까지 전부 다시 그린다. 전사 뷰가 초당 네 번 통째로 다시 그려지던 자리다
  const controls = useMemo(
    () => ({ track, rate, play, seek, toggle, setRate }),
    [track, rate, play, seek, toggle, setRate],
  )
  const time = useMemo(() => ({ currentTime, duration }), [currentTime, duration])

  return (
    <PlayerControlsContext value={controls}>
      <PlayerTimeContext value={time}>
        <PlayerPlayingContext value={playing}>{children}</PlayerPlayingContext>
      </PlayerTimeContext>
    </PlayerControlsContext>
  )
}

function IconButton({
  label,
  onClick,
  primary,
  children,
}: {
  label: string
  onClick: () => void
  primary?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={
        primary
          ? 'flex h-9 w-9 items-center justify-center rounded-[6px] bg-accent text-accent-text-on transition-colors duration-120 hover:bg-accent-hover'
          : 'flex h-8 w-8 items-center justify-center rounded-[6px] text-text-secondary transition-colors duration-120 hover:bg-bg'
      }
    >
      {children}
    </button>
  )
}

export function PlayerBar() {
  const { track, rate, seek, toggle, setRate } = usePlayerControls()
  const { currentTime, duration } = usePlayerTime()
  const playing = usePlayerPlaying()
  const barRef = useRef<HTMLDivElement | null>(null)
  const [hovering, setHovering] = useState(false)

  if (!track) return null

  const progress = duration > 0 ? currentTime / duration : 0

  const onBarClick = (e: React.MouseEvent) => {
    const rect = barRef.current?.getBoundingClientRect()
    if (!rect || duration <= 0) return
    seek(((e.clientX - rect.left) / rect.width) * duration)
  }

  return (
    <div className="flex h-16 shrink-0 items-center gap-4 border-t border-border bg-surface px-4">
      <div className="w-56 min-w-0">
        <p className="truncate text-sm font-medium">{track.title}</p>
        {track.subtitle && (
          <p className="truncate text-xs text-text-tertiary">{track.subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <IconButton label="10초 뒤로" onClick={() => seek(Math.max(0, currentTime - 10))}>
          <RotateCcw size={18} strokeWidth={1.75} />
        </IconButton>
        <IconButton label={playing ? '일시정지' : '재생'} onClick={toggle} primary>
          {playing ? (
            <Pause size={18} strokeWidth={1.75} />
          ) : (
            <Play size={18} strokeWidth={1.75} />
          )}
        </IconButton>
        <IconButton label="10초 앞으로" onClick={() => seek(currentTime + 10)}>
          <RotateCw size={18} strokeWidth={1.75} />
        </IconButton>
      </div>
      <div
        ref={barRef}
        role="slider"
        aria-label="재생 위치"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(currentTime)}
        tabIndex={0}
        className="flex-1 cursor-pointer py-3"
        onClick={onBarClick}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') seek(Math.max(0, currentTime - 5))
          if (e.key === 'ArrowRight') seek(currentTime + 5)
        }}
      >
        <div className="w-full rounded-full bg-border" style={{ height: hovering ? 6 : 4 }}>
          {/* 재생 커서는 트랜지션 없이 즉시 이동 */}
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
      <div className="tnum flex items-center gap-3 text-sm text-text-secondary">
        <span>
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </span>
        <button
          type="button"
          onClick={() => setRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length])}
          className="tnum h-8 rounded-[6px] border border-border-strong px-2 text-xs text-text-secondary hover:bg-bg"
        >
          {rate}x
        </button>
      </div>
    </div>
  )
}
