import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, setUnauthorizedHandler, type Me } from '../api'
import { setWorkspaceId } from '../workspace'
import { AuthContext, type AuthState } from './context'

function rememberWorkspace(me: Me) {
  const chosen =
    me.workspaces.find((w) => w.id === me.default_workspace_id) ?? me.workspaces[0] ?? null
  setWorkspaceId(chosen?.id ?? '')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ phase: 'checking' })

  const adopt = useCallback((me: Me) => {
    rememberWorkspace(me)
    setState({ phase: 'known', me })
  }, [])

  const refresh = useCallback(async () => {
    try {
      adopt(await api.me())
    } catch {
      // 401이든 연결 실패든 화면에서는 같다: 아직 못 들어온 사람
      setState({ phase: 'anonymous' })
    }
  }, [adopt])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } finally {
      setWorkspaceId('')
      setState({ phase: 'anonymous' })
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // 세션이 중간에 끊기면 익명으로 돌린다. 401만 여기 온다 — 403은 로그인 화면으로
  // 보내면 무한 반복이라 전송 층이 부르지 않는다
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setWorkspaceId('')
      setState({ phase: 'anonymous' })
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  const value = useMemo(() => ({ state, adopt, refresh, logout }), [state, adopt, refresh, logout])
  return <AuthContext value={value}>{children}</AuthContext>
}
