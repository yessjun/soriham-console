import { useState } from 'react'
import { api, type Account } from '../api'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState, ErrorNote, ListSkeleton } from '../components/ui'
import { useAsync } from '../hooks'
import { useAuth } from '../auth/context'
import { UserCheck } from 'lucide-react'

const TABS: { key: string; label: string }[] = [
  { key: 'pending', label: '승인 대기' },
  { key: 'active', label: '사용 중' },
  { key: 'disabled', label: '중지됨' },
  { key: 'rejected', label: '거절됨' },
]

// 상태마다 무엇으로 옮길 수 있는지. 화면이 역할 산술을 하지 않도록 여기 한 곳에 둔다
const ACTIONS: Record<string, { to: string; label: string; destructive?: boolean }[]> = {
  pending: [
    { to: 'active', label: '승인' },
    { to: 'rejected', label: '거절', destructive: true },
  ],
  active: [{ to: 'disabled', label: '중지', destructive: true }],
  disabled: [{ to: 'active', label: '다시 사용' }],
  rejected: [{ to: 'active', label: '거절 취소' }],
}

const EMPTY: Record<string, string> = {
  pending: '기다리는 신청이 없습니다',
  active: '사용 중인 계정이 없습니다',
  disabled: '중지된 계정이 없습니다',
  rejected: '거절된 계정이 없습니다',
}

export default function AdminPage() {
  const { refresh } = useAuth()
  const [tab, setTab] = useState('pending')
  const [pending, setPending] = useState<{ account: Account; to: string; label: string } | null>(
    null,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const query = useAsync(() => api.accounts(tab), [tab])

  async function apply() {
    if (!pending) return
    setBusy(true)
    setError('')
    try {
      await api.setAccountStatus(pending.account.id, pending.to)
      setPending(null)
      query.reload()
      // 대기 인원 배지는 내 정보에 실려 온다
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '상태를 바꾸지 못했습니다')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="px-6 py-6">
      <h2 className="text-lg font-semibold">계정 관리</h2>
      <div className="mt-4 flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key || undefined}
            className={`h-8 rounded-[6px] px-3 text-sm ${
              tab === t.key
                ? 'bg-accent-subtle font-medium text-accent'
                : 'text-text-secondary hover:bg-bg'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <ErrorNote message={error} />}
      {query.error && <ErrorNote message={query.error} />}
      {query.loading && <ListSkeleton rows={3} />}
      {query.data?.length === 0 && <EmptyState icon={UserCheck} message={EMPTY[tab]} />}

      <ul className="mt-4 flex flex-col">
        {(query.data ?? []).map((account) => (
          <li
            key={account.id}
            className="flex min-h-14 items-center gap-4 border-b border-border py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text">{account.name}</p>
              <p className="truncate text-sm text-text-secondary">{account.email}</p>
              {account.signup_note && (
                <p className="mt-1 truncate text-sm text-text-tertiary">{account.signup_note}</p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              {(ACTIONS[account.status] ?? []).map((action) => (
                <Button
                  key={action.to}
                  variant={action.destructive ? 'ghost' : 'primary'}
                  onClick={() => setPending({ account, to: action.to, label: action.label })}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={pending !== null}
        title={`${pending?.account.name ?? ''} 계정을 ${pending?.label ?? ''}합니다`}
        description={
          pending?.to === 'rejected'
            ? '거절하면 그 사람의 빈 개인 워크스페이스가 함께 사라집니다.'
            : pending?.to === 'disabled'
              ? '중지하면 지금 열려 있는 세션이 모두 끊깁니다.'
              : undefined
        }
        confirmLabel={pending?.label ?? ''}
        busy={busy}
        onConfirm={() => void apply()}
        onCancel={() => setPending(null)}
      />
    </div>
  )
}
