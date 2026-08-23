import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { AuthLayout } from '../layouts/AuthLayout'
import { useAuth } from '../auth/context'

export default function LoginPage() {
  const { state, adopt } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (state.phase === 'known') return <Navigate to="/" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      adopt(await api.login(email, password))
      // 대기 계정을 어디로 보낼지는 RequireAuth가 정한다. 여기서 한 번 더 판단하면
      // 같은 규칙이 두 곳에 생긴다
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? '/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다')
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="소리함"
      description="녹음을 올리고 찾아 듣는 곳"
      footer={
        <>
          계정이 없으신가요? <Link to="/signup" className="text-accent">가입 신청</Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input
          name="email"
          type="email"
          label="이메일"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          name="password"
          type="password"
          label="비밀번호"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-error">{error}</p>}
        <Button type="submit" variant="primary" busy={busy} className="w-full">
          로그인
        </Button>
      </form>
    </AuthLayout>
  )
}
