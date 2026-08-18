import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'
import { api, UploadError } from '../api'

/** 서버가 받는 확장자 (api의 AUDIO_EXTENSIONS와 같은 목록) */
export const AUDIO_EXTENSIONS = [
  '.wav',
  '.mp3',
  '.m4a',
  '.aac',
  '.flac',
  '.ogg',
  '.opus',
  '.wma',
  '.amr',
  '.awb',
  '.3gp',
]

export const AUDIO_ACCEPT = AUDIO_EXTENSIONS.join(',')

function isAudio(file: File): boolean {
  const name = file.name.toLowerCase()
  return AUDIO_EXTENSIONS.some((ext) => name.endsWith(ext))
}

export interface UploadItem {
  id: number
  name: string
  /** 0~1, 서버 응답 대기 중이면 1 */
  ratio: number
  error?: string
  /** 중복이라 거절됐을 때 기존 녹음 */
  existingId?: string
}

interface UploadState {
  items: UploadItem[]
  /** 완료 건수 — 목록 갱신 트리거로 쓴다 */
  completed: number
  add: (files: FileList | File[]) => void
  dismiss: (id: number) => void
}

const UploadContext = createContext<UploadState | null>(null)

export function useUpload(): UploadState {
  const ctx = useContext(UploadContext)
  if (!ctx) throw new Error('UploadProvider 밖에서 useUpload를 호출함')
  return ctx
}

/**
 * 업로드 큐. 디스크 쓰기가 어차피 직렬이라 한 건씩 순차로 보낸다.
 * 화면 전환에도 진행과 실패가 살아남게 앱 셸에 둔다.
 */
export function UploadProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<UploadItem[]>([])
  const [completed, setCompleted] = useState(0)
  const seq = useRef(0)
  const running = useRef(false)
  const queue = useRef<{ id: number; file: File }[]>([])

  // 드롭존 밖에 놓았을 때 브라우저가 파일을 열어 앱이 통째로 날아가는 것을 막는다
  useEffect(() => {
    const block = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault()
    }
    window.addEventListener('dragover', block)
    window.addEventListener('drop', block)
    return () => {
      window.removeEventListener('dragover', block)
      window.removeEventListener('drop', block)
    }
  }, [])

  const drain = useCallback(async () => {
    if (running.current) return
    running.current = true
    try {
      let next = queue.current.shift()
      while (next) {
        const { id, file } = next
        try {
          const { promise } = api.uploadRecording(file, (ratio) =>
            setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ratio } : it))),
          )
          await promise
          setItems((prev) => prev.filter((it) => it.id !== id))
          setCompleted((n) => n + 1)
        } catch (e) {
          const err = e as UploadError
          setItems((prev) =>
            prev.map((it) =>
              it.id === id ? { ...it, error: err.message, existingId: err.recordingId } : it,
            ),
          )
        }
        next = queue.current.shift()
      }
    } finally {
      running.current = false
    }
  }, [])

  const add = useCallback(
    (files: FileList | File[]) => {
      const all = Array.from(files)
      if (all.length === 0) return
      const rejected = all.filter((f) => !isAudio(f))
      const accepted = all.filter(isAudio).map((file) => ({ id: ++seq.current, file }))
      setItems((prev) => [
        ...prev,
        ...accepted.map(({ id, file }) => ({ id, name: file.name, ratio: 0 })),
        ...rejected.map((file) => ({
          id: ++seq.current,
          name: file.name,
          ratio: 0,
          error: '오디오 파일이 아닙니다',
        })),
      ])
      if (accepted.length > 0) {
        queue.current.push(...accepted)
        void drain()
      }
    },
    [drain],
  )

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }, [])

  const value = useMemo(
    () => ({ items, completed, add, dismiss }),
    [items, completed, add, dismiss],
  )
  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>
}

export function UploadList() {
  const { items, dismiss } = useUpload()
  if (items.length === 0) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 flex flex-col gap-2 rounded-[10px] border border-border bg-surface p-4"
    >
      {items.map((item) => (
        <div key={item.id} className="flex flex-col gap-1">
          <div className="flex items-baseline gap-3">
            <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
            {item.error ? (
              <button
                type="button"
                aria-label={`${item.name} 지우기`}
                onClick={() => dismiss(item.id)}
                className="text-xs text-text-tertiary hover:text-text"
              >
                지우기
              </button>
            ) : (
              <span className="tnum text-xs text-text-tertiary">
                {Math.round(item.ratio * 100)}%
              </span>
            )}
          </div>
          {item.error ? (
            <p className="text-sm text-error">
              {item.error}
              {item.existingId && (
                <>
                  {' '}
                  <Link to={`/recordings/${item.existingId}`} className="underline">
                    기존 녹음 보기
                  </Link>
                </>
              )}
            </p>
          ) : (
            <div
              role="progressbar"
              aria-label={`${item.name} 업로드`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(item.ratio * 100)}
              className="h-1 w-full rounded-[6px] bg-border"
            >
              <div
                className="h-full rounded-[6px] bg-accent transition-[width] duration-120"
                style={{ width: `${item.ratio * 100}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/** 파일을 끌어오는 동안에만 보이는 드롭 안내 */
export function DropOverlay({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden={!active}
      className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[10px] border border-dashed border-accent bg-accent-subtle transition-opacity duration-120 ${
        active ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <p className="text-sm text-text-secondary">여기에 놓아 업로드</p>
    </div>
  )
}
