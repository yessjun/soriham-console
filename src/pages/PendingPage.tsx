import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { AuthLayout } from '../layouts/AuthLayout'
import { useAuth } from '../auth/context'

const POLL_MS = 60_000

const MESSAGE: Record<string, { title: string; body: string }> = {
  pending: {
    title: '승인을 기다리는 중입니다',
    body: '관리자가 신청을 확인하면 바로 쓸 수 있습니다. 이 화면은 1분마다 스스로 다시 확인합니다.',
  },
  rejected: {
    title: '가입이 거절됐습니다',
    body: '다시 신청하려면 관리자에게 문의하세요.',
  },
  disabled: {
    title: '사용이 중지된 계정입니다',
    body: '관리자에게 문의하세요.',
  },
}

export default function PendingPage() {
  const { state, refresh, logout } = useAuth()
  const status = state.phase === 'known' ? state.me.status : null

  // 승인은 관리자가 다른 화면에서 누른다. 알릴 방법이 없으니 스스로 확인한다
  useEffect(() => {
    if (status !== 'pending') return
    const timer = setInterval(() => void refresh(), POLL_MS)
    return () => clearInterval(timer)
  }, [status, refresh])

  if (state.phase === 'anonymous') return <Navigate to="/login" replace />
  // 빈 화면 대신 껍데기를 남긴다
  if (state.phase === 'checking') return <AuthLayout title="소리함">{null}</AuthLayout>
  if (state.me.status === 'active') return <Navigate to="/" replace />

  const text = MESSAGE[state.me.status] ?? MESSAGE.pending
  return (
    <AuthLayout title={text.title} description={text.body}>
      <div className="flex flex-col gap-3">
        {state.me.status === 'pending' && (
          <Button variant="primary" onClick={() => void refresh()} className="w-full">
            지금 다시 확인
          </Button>
        )}
        {/* 로그아웃이 없으면 다른 계정으로 들어갈 방법이 없다 */}
        <Button onClick={() => void logout()} className="w-full">
          로그아웃
        </Button>
      </div>
    </AuthLayout>
  )
}
