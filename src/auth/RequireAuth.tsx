import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ListSkeleton } from '../components/ui'
import { AppShell } from '../layouts/AppShell'
import { useAuth } from './context'

/**
 * 로그인한 활성 계정만 통과시킨다.
 *
 * 확인이 끝나기 전에는 로그인 화면으로도 보내지 않는다. 세션이 살아 있는데 로그인
 * 화면이 한 번 스쳤다 사라지면 고장으로 읽힌다. 껍데기를 먼저 그리고 내용만 비워 둔다.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { state } = useAuth()
  const location = useLocation()

  if (state.phase === 'checking') {
    return (
      <AppShell>
        <div className="p-6">
          <ListSkeleton />
        </div>
      </AppShell>
    )
  }
  if (state.phase === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (state.me.status !== 'active') {
    return <Navigate to="/pending" replace />
  }
  return <AppShell>{children}</AppShell>
}
