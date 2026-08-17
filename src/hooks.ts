import { useCallback, useEffect, useRef, useState } from 'react'

export interface AsyncState<T> {
  data: T | null
  error: string | null
  loading: boolean
  reload: () => void
}

// 최소 데이터 훅: 로딩은 200ms 이상 걸릴 때만 표시(디자인 시스템 로딩 규칙)
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [tick, setTick] = useState(0)
  const seq = useRef(0)

  useEffect(() => {
    const current = ++seq.current
    setError(null)
    const timer = setTimeout(() => {
      if (seq.current === current) setLoading(true)
    }, 200)
    fn().then(
      (result) => {
        if (seq.current !== current) return
        clearTimeout(timer)
        setData(result)
        setLoading(false)
      },
      (err: Error) => {
        if (seq.current !== current) return
        clearTimeout(timer)
        setError(err.message)
        setLoading(false)
      },
    )
    return () => clearTimeout(timer)
    // fn은 호출부 인라인 함수라 deps로 관리하지 않는다(무한 재실행 방지)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, error, loading, reload }
}
