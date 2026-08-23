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
export function RequireAuth({
  children,
  capability,
}: {
  children: ReactNode
  /** 이 능력이 없으면 주소를 직접 쳐도 화면 자체를 그리지 않는다 */
  capability?: string
}) {
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
    // 쿼리까지 기억한다. 경로만 담으면 태그 필터를 걸어 둔 사람이 재로그인 후 잃는다
    return (
      <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
    )
  }
  if (state.me.status !== 'active') {
    return <Navigate to="/pending" replace />
  }
  // 데이터는 서버가 막지만, 못 쓰는 화면을 그려 놓고 누르게 하지는 않는다
  if (capability && !state.me.capabilities.includes(capability)) {
    return <Navigate to="/" replace />
  }
  return <AppShell>{children}</AppShell>
}
