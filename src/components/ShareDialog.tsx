import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { api, type IssuedShareLink, type SharePanel } from '../api'
import { Button } from './Button'
import { ConfirmDialog } from './ConfirmDialog'
import { CopyButton } from './CopyButton'
import { Input } from './Input'
import { Modal } from './Modal'
import { useAsync } from '../hooks'
import { ErrorNote } from './ui'

type Props = {
  recordingId: string
  open: boolean
  onClose: () => void
  onChanged?: () => void
}

const EXPIRY = [
  { days: 7, label: '7일' },
  { days: 30, label: '30일' },
  { days: 90, label: '90일' },
  { days: null, label: '무기한' },
]

type Pending =
  | { kind: 'user'; id: string; name: string }
  | { kind: 'link'; id: string; name: string }

/**
 * 공유 화면 하나에 세 블록을 세로로 놓는다.
 *
 * 탭으로 나누면 "이 녹음이 지금 누구에게 열려 있나"를 한눈에 볼 수 없다. 답해야 하는
 * 질문이 그것이라 세 갈래를 함께 보여준다.
 */
export function ShareDialog({ recordingId, open, onClose, onChanged }: Props) {
  const panel = useAsync<SharePanel | null>(
    () => (open ? api.sharePanel(recordingId) : Promise.resolve(null)),
    [open, recordingId],
  )
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState('view')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [issued, setIssued] = useState<IssuedShareLink | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)

  // 링크 발급 폼
  const [label, setLabel] = useState('')
  const [password, setPassword] = useState('')
  const [allowAudio, setAllowAudio] = useState(true)
  const [allowNames, setAllowNames] = useState(true)
  const [expiry, setExpiry] = useState<number | null>(30)

  function reload() {
    panel.reload()
    onChanged?.()
  }

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await action()
      reload()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : '처리하지 못했습니다')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function invite() {
    const ok = await run(() => api.addShare(recordingId, email, permission))
    if (ok) setEmail('')
  }

  async function issue() {
    await run(async () => {
      const link = await api.createLink(recordingId, {
        label: label || undefined,
        password: password || undefined,
        allow_audio: allowAudio,
        allow_speaker_names: allowNames,
        expires_in_days: expiry,
      })
      setIssued(link)
      setLabel('')
      setPassword('')
    })
  }

  async function confirmRevoke() {
    if (!pending) return
    const ok = await run(() =>
      pending.kind === 'user'
        ? api.removeShare(recordingId, pending.id)
        : api.revokeLink(recordingId, pending.id),
    )
    if (ok) setPending(null)
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="공유" width={560}>
        {error && <ErrorNote message={error} />}
        {panel.error && <ErrorNote message={panel.error} />}

        <section>
          <h3 className="text-sm font-semibold text-text">사람</h3>
          <div className="mt-2 flex items-end gap-2">
            <Input
              name="share-email"
              type="email"
              label="이메일"
              className="flex-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onEnter={() => void invite()}
            />
            <select
              aria-label="권한"
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              className="h-9 rounded-[6px] border border-border-strong bg-surface px-2 text-sm text-text"
            >
              <option value="view">열람</option>
              <option value="edit">편집</option>
            </select>
            <Button variant="primary" onClick={() => void invite()} busy={busy}>
              공유
            </Button>
          </div>
          <ul className="mt-3 flex flex-col gap-1">
            {(panel.data?.users ?? []).map((user) => (
              <li key={user.id} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {user.name ?? user.email}
                  {user.pending && (
                    <span className="ml-1 text-text-tertiary">가입하면 연결됩니다</span>
                  )}
                </span>
                <span className="text-text-secondary">
                  {user.permission === 'edit' ? '편집' : '열람'}
                </span>
                <Button
                  variant="ghost"
                  aria-label={`${user.email} 공유 해제`}
                  onClick={() =>
                    setPending({ kind: 'user', id: user.id, name: user.name ?? user.email })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-text">링크</h3>
          <p className="mt-1 text-sm text-text-secondary">
            링크를 가진 사람은 로그인 없이 이 녹음을 봅니다.
          </p>
          <div className="mt-2 flex flex-col gap-3">
            <Input
              name="link-label"
              label="메모 (선택)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <Input
              name="link-password"
              type="password"
              label="비밀번호 (선택)"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allowAudio}
                  onChange={(e) => setAllowAudio(e.target.checked)}
                />
                오디오 재생 허용
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allowNames}
                  onChange={(e) => setAllowNames(e.target.checked)}
                />
                화자 이름 노출
              </label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">만료</span>
              <select
                aria-label="만료"
                value={expiry === null ? 'none' : String(expiry)}
                onChange={(e) => setExpiry(e.target.value === 'none' ? null : Number(e.target.value))}
                className="h-9 rounded-[6px] border border-border-strong bg-surface px-2 text-sm text-text"
              >
                {EXPIRY.map((option) => (
                  <option key={option.label} value={option.days === null ? 'none' : option.days}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button variant="primary" onClick={() => void issue()} busy={busy}>
                링크 만들기
              </Button>
            </div>
          </div>

          {issued && (
            <div className="mt-3 rounded-[10px] border border-border bg-bg p-3">
              <p className="text-sm text-text-secondary">
                지금 복사해 두세요. 이 주소는 다시 보여 주지 않습니다.
              </p>
              <div className="mt-2">
                <CopyButton value={`${location.origin}/s/${issued.token}`} label="링크 복사" />
              </div>
            </div>
          )}

          <ul className="mt-3 flex flex-col gap-1">
            {(panel.data?.links ?? []).map((link) => (
              <li key={link.id} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {link.label ?? '이름 없는 링크'}
                  <span className="ml-2 text-text-tertiary">
                    {link.has_password ? '비밀번호 있음' : '비밀번호 없음'}
                    {!link.allow_audio && ', 오디오 잠금'}
                    {!link.allow_speaker_names && ', 화자 이름 숨김'}
                  </span>
                </span>
                <span className="tnum text-text-secondary">{link.view_count}회</span>
                <Button
                  variant="ghost"
                  aria-label={`${link.label ?? '이름 없는 링크'} 철회`}
                  onClick={() =>
                    setPending({ kind: 'link', id: link.id, name: link.label ?? '이 링크' })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-text">워크스페이스</h3>
          <p className="mt-1 text-sm text-text-secondary">
            {panel.data?.workspace_name
              ? `${panel.data.workspace_name}의 구성원은 이미 볼 수 있습니다.`
              : ''}
          </p>
        </section>
      </Modal>

      <ConfirmDialog
        open={pending !== null}
        title={
          pending?.kind === 'link'
            ? `${pending.name}을 철회합니다`
            : `${pending?.name ?? ''}의 공유를 해제합니다`
        }
        description={
          pending?.kind === 'link'
            ? '이 주소를 가진 사람은 더 이상 열 수 없습니다.'
            : '이 사람은 더 이상 이 녹음을 볼 수 없습니다.'
        }
        confirmLabel={pending?.kind === 'link' ? '철회하기' : '해제하기'}
        busy={busy}
        onConfirm={() => void confirmRevoke()}
        onCancel={() => setPending(null)}
      />
    </>
  )
}
