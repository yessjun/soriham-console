import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from './http'

export interface AsyncState<T> {
  data: T | null
  error: string | null
  /** 서버가 준 상태 코드. 401과 403은 화면이 다르게 다뤄야 한다 */
  errorStatus: number | null
  loading: boolean
  reload: () => void
}

/**
 * 최소 데이터 훅. 로딩은 200ms 이상 걸릴 때만 표시한다(디자인 시스템 로딩 규칙).
 *
 * `deps`는 **무엇을 부르는지**다. 바뀌면 앞 값을 버린다 — 다른 녹음의 주소에 앞 녹음의
 * 전사가 남으면 안 된다. `refreshDeps`는 **왜 다시 부르는지**다. 대상은 그대로이므로
 * 값을 버리지 않는다 — 업로드가 끝날 때마다, 더 보기를 누를 때마다 목록이 비면
 * 화면이 깜빡인다.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[],
  refreshDeps: unknown[] = [],
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [tick, setTick] = useState(0)
  const seq = useRef(0)
  const lastKey = useRef<string | null>(null)

  useEffect(() => {
    const current = ++seq.current
    setError(null)
    setErrorStatus(null)
    // 대상이 바뀔 때만 버린다. refreshDeps와 폴링은 여기 걸리지 않는다
    const key = JSON.stringify(deps)
    if (lastKey.current !== key) {
      lastKey.current = key
      setData(null)
    }
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
        setErrorStatus(err instanceof ApiError ? err.status : null)
        setLoading(false)
      },
    )
    return () => clearTimeout(timer)
    // fn은 호출부 인라인 함수라 deps로 관리하지 않는다(무한 재실행 방지)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, ...refreshDeps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, error, errorStatus, loading, reload }
}
