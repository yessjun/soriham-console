import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ApiError, api, setForbiddenHandler, setUnauthorizedHandler, type Me } from '../api'
import { AuthContext, type AuthState } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ phase: 'checking' })
  // 늦게 온 응답이 최신 상태를 덮지 않게 한다. 로그아웃 뒤에 도착한 조회가 세션을
  // 되살리거나, 로그인 뒤에 도착한 부트스트랩 거부가 방금 들어온 사람을 쫓아낸다
  const generation = useRef(0)

  const adopt = useCallback((me: Me) => {
    generation.current += 1
    setState({ phase: 'known', me })
  }, [])

  const refresh = useCallback(async () => {
    const mine = ++generation.current
    try {
      const me = await api.me()
      if (generation.current === mine) setState({ phase: 'known', me })
    } catch (error) {
      if (generation.current !== mine) return
      // 세션이 없는 것과 서버에 못 닿은 것은 다르다. 연결이 끊겼다고 로그인 화면으로
      // 보내면 대기 화면을 켜 둔 사람이 서버 재시작마다 쫓겨난다
      if (error instanceof ApiError && error.status === 401) {
        setState({ phase: 'anonymous' })
      } else if (state.phase === 'checking') {
        // 첫 확인에서 못 닿았으면 보여줄 것이 없다. 로그인 화면이 그나마 할 일이 있다
        setState({ phase: 'anonymous' })
      }
    }
  }, [state.phase])

  const logout = useCallback(async () => {
    generation.current += 1
    try {
      await api.logout()
    } catch {
      // 서버가 못 받아도 이 브라우저에서는 나간 것으로 친다
    }
    setState({ phase: 'anonymous' })
  }, [])

  useEffect(() => {
    void refresh()
    // 부트스트랩은 한 번만 돈다. refresh는 state를 물고 있어 deps에 넣으면 매번 다시 돈다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // 401은 세션이 죽은 것이다
    setUnauthorizedHandler(() => {
      generation.current += 1
      setState({ phase: 'anonymous' })
    })
    // 403은 로그인은 됐는데 못 하는 것이다. 계정이 중지된 경우가 여기 오는데, 캐시된
    // 상태가 활성이라 화면이 그대로 남는다. 한 번 다시 물어 대기 화면으로 보낸다
    setForbiddenHandler(() => void refresh())
    return () => {
      setUnauthorizedHandler(null)
      setForbiddenHandler(null)
    }
  }, [refresh])

  const value = useMemo(() => ({ state, adopt, refresh, logout }), [state, adopt, refresh, logout])
  return <AuthContext value={value}>{children}</AuthContext>
}
