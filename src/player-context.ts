import { createContext, useContext } from 'react'

export interface PlayerTrack {
  recordingId: string
  title: string
  subtitle?: string
  /** 오디오 주소. 비우면 로그인 경로를 쓴다. 공유 링크는 토큰 경로를 넘긴다 */
  src?: string
}

/** 거의 안 바뀌는 값. 트랙 교체와 배속 변경 때만 움직인다 */
export interface PlayerControls {
  track: PlayerTrack | null
  rate: number
  play: (track: PlayerTrack, atSec?: number) => void
  seek: (sec: number) => void
  toggle: () => void
  setRate: (rate: number) => void
}

/** 재생 중 초당 네 번 바뀐다. 이걸 구독하는 컴포넌트만 그만큼 다시 그린다 */
export interface PlayerTime {
  currentTime: number
  duration: number
}

export const PlayerControlsContext = createContext<PlayerControls | null>(null)
export const PlayerTimeContext = createContext<PlayerTime | null>(null)
export const PlayerPlayingContext = createContext<boolean>(false)

export function usePlayerControls(): PlayerControls {
  const ctx = useContext(PlayerControlsContext)
  if (!ctx) throw new Error('PlayerProvider 밖에서 usePlayerControls를 불렀다')
  return ctx
}

export function usePlayerTime(): PlayerTime {
  const ctx = useContext(PlayerTimeContext)
  if (!ctx) throw new Error('PlayerProvider 밖에서 usePlayerTime을 불렀다')
  return ctx
}

export function usePlayerPlaying(): boolean {
  return useContext(PlayerPlayingContext)
}
