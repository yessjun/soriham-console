import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { AuthLayout } from '../layouts/AuthLayout'
import { useAuth } from '../auth/context'

export default function SignupPage() {
  const { state, adopt } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', display_name: '', signup_note: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (state.phase === 'known') return <Navigate to="/" replace />

  function set(key: keyof typeof form) {
    return (event: { target: { value: string } }) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const me = await api.signup({
        email: form.email,
        password: form.password,
        display_name: form.display_name,
        signup_note: form.signup_note || undefined,
      })
      adopt(me)
      // 가입은 되지만 바로 쓰지는 못한다. 왜 못 쓰는지를 보여주는 화면으로 보낸다
      navigate(me.status === 'active' ? '/' : '/pending', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '가입 신청에 실패했습니다')
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="가입 신청"
      description="관리자가 승인하면 쓸 수 있습니다"
      footer={
        <>
          이미 계정이 있으신가요? <Link to="/login" className="text-accent">로그인</Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input
          name="display_name"
          label="이름"
          autoComplete="name"
          value={form.display_name}
          onChange={set('display_name')}
          required
        />
        <Input
          name="email"
          type="email"
          label="이메일"
          autoComplete="username"
          value={form.email}
          onChange={set('email')}
          required
        />
        <Input
          name="password"
          type="password"
          label="비밀번호"
          autoComplete="new-password"
          value={form.password}
          onChange={set('password')}
          required
        />
        <Input
          name="signup_note"
          label="관리자에게 남길 말 (선택)"
          value={form.signup_note}
          onChange={set('signup_note')}
        />
        {error && <p className="text-sm text-error">{error}</p>}
        <Button type="submit" variant="primary" busy={busy} className="w-full">
          신청하기
        </Button>
      </form>
    </AuthLayout>
  )
}
