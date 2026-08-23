import { createContext, useContext } from 'react'
import type { Me } from '../api'

export type AuthState =
  // 앱이 뜨자마자 "내가 누구인지"를 한 번 묻는 동안
  | { phase: 'checking' }
  | { phase: 'anonymous' }
  | { phase: 'known'; me: Me }

export type AuthValue = {
  state: AuthState
  /** 로그인·가입 응답으로 상태를 채운다 */
  adopt: (me: Me) => void
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

// 컨텍스트와 훅만 둔다. 컴포넌트와 한 파일에 있으면 fast refresh가 깨진다
export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider 밖에서 useAuth를 불렀다')
  return value
}

/** 활성 계정일 때만 사용자를 준다. 대기·중지 계정은 null */
export function useActiveMe(): Me | null {
  const { state } = useAuth()
  return state.phase === 'known' && state.me.status === 'active' ? state.me : null
}
