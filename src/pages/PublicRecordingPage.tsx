import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { ApiError, api, type SharedRecording } from '../api'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Transcript } from '../components/Transcript'
import { EmptyState, ListSkeleton, ProgressLine, TagChip } from '../components/ui'
import { formatDate, formatDuration } from '../format'
import { useAsync } from '../hooks'
import { AuthLayout } from '../layouts/AuthLayout'
import { PublicLayout } from '../layouts/PublicLayout'
import { PlayerBar } from '../player'
import { FileQuestion } from 'lucide-react'

export default function PublicRecordingPage() {
  const { token = '' } = useParams<{ token: string }>()
  const [unlocked, setUnlocked] = useState(0)
  const query = useAsync<SharedRecording | null>(() => api.sharedRecording(token), [token, unlocked])

  // 비밀번호가 걸린 링크는 잠금 해제 전에 상세도 주지 않는다
  if (query.error && (query.errorStatus === 401 || query.error.includes('비밀번호'))) {
    return <UnlockForm token={token} onUnlocked={() => setUnlocked((n) => n + 1)} />
  }
  // 첫 200ms는 loading이 false라 여기서 걸러내지 않으면 "링크가 유효하지 않습니다"가
  // 잠깐 스쳤다가 본문으로 바뀐다
  if (!query.data && !query.error) {
    return <PublicLayout>{query.loading ? <ListSkeleton /> : null}</PublicLayout>
  }
  if (query.error || !query.data) {
    return (
      <PublicLayout>
        <EmptyState icon={FileQuestion} message="링크가 유효하지 않습니다" />
      </PublicLayout>
    )
  }

  const rec = query.data
  const track = {
    recordingId: `shared:${token}`,
    title: rec.title ?? '제목 없는 녹음',
    src: api.sharedAudioUrl(token),
  }

  return (
    // 오디오를 막은 링크에는 플레이어를 그리지 않는다
    <PublicLayout footer={rec.allow_audio ? <PlayerBar /> : null}>
      <h1 className="text-2xl font-bold tracking-[-0.01em]">{rec.title ?? '제목 없는 녹음'}</h1>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
        <span className="tnum">{formatDate(rec.recorded_at)}</span>
        <span className="tnum">{formatDuration(rec.duration_sec)}</span>
        {rec.tags.map((tag) => (
          <TagChip key={tag.id} name={tag.name} />
        ))}
      </div>

      {rec.status === 'processing' ? (
        // 두 시간짜리 회의를 올리고 바로 공유하면 받는 사람이 전사 전에 연다
        <div className="mt-8 rounded-[10px] border border-border bg-surface p-6 text-center">
          <p className="text-sm text-text-secondary">아직 변환하는 중입니다.</p>
          <div className="mt-2 flex justify-center">
            <ProgressLine progress={rec.progress} etaSec={rec.eta_sec} />
          </div>
          <p className="mt-2 text-sm text-text-tertiary">잠시 후 다시 열어 보세요.</p>
        </div>
      ) : rec.status === 'unavailable' ? (
        <p className="mt-8 text-center text-sm text-text-secondary">
          지금은 이 녹음을 볼 수 없습니다.
        </p>
      ) : (
        <>
          {rec.summary && (
            <p className="mt-4 rounded-[10px] border border-border bg-surface p-4 text-base">
              {rec.summary}
            </p>
          )}
          <section className="mt-6">
            <Transcript
              segments={rec.segments}
              speakerNames={rec.speaker_names}
              track={track}
              showSpeakerNames={Object.keys(rec.speaker_names).length > 0}
              playable={rec.allow_audio}
            />
          </section>
        </>
      )}

    </PublicLayout>
  )
}

function UnlockForm({ token, onUnlocked }: { token: string; onUnlocked: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.unlockShared(token, password)
      onUnlocked()
    } catch (err) {
      // 몇 번 남았는지는 알려주지 않는다
      setError(err instanceof ApiError ? err.message : '열지 못했습니다')
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="비밀번호가 필요합니다" description="공유한 사람에게 받은 비밀번호를 넣으세요">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input
          name="link-password"
          type="password"
          label="비밀번호"
          autoComplete="off"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" busy={busy} className="w-full">
          열기
        </Button>
      </form>
    </AuthLayout>
  )
}
