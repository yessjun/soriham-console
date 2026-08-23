import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PublicRecordingPage from '../PublicRecordingPage'
import { PlayerProvider } from '../../player'
import { ApiError, api, type SharedRecording } from '../../api'

function shared(overrides: Partial<SharedRecording> = {}): SharedRecording {
  return {
    title: '8월 회의',
    summary: '요약입니다',
    recorded_at: '2026-08-20T00:00:00Z',
    duration_sec: 600,
    status: 'done',
    language: 'ko',
    tags: [],
    progress: null,
    eta_sec: null,
    allow_audio: true,
    speaker_names: { SPEAKER_00: '김실명' },
    segments: [
      {
        idx: 0,
        start_sec: 0,
        end_sec: 5,
        speaker_key: 'SPEAKER_00',
        text: '안녕하세요',
        kind: 'speech',
      },
    ],
    ...overrides,
  }
}

function renderPublic() {
  return render(
    <MemoryRouter initialEntries={['/s/tok']}>
      <PlayerProvider>
        <Routes>
          <Route path="/s/:token" element={<PublicRecordingPage />} />
        </Routes>
      </PlayerProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('공개 열람', () => {
  it('로그인 없이 전사를 보여준다', async () => {
    vi.spyOn(api, 'sharedRecording').mockResolvedValue(shared())
    renderPublic()

    expect(await screen.findByText('8월 회의')).toBeInTheDocument()
    expect(screen.getByText('안녕하세요')).toBeInTheDocument()
  })

  it('편집 컨트롤을 그리지 않는다', async () => {
    // 비활성으로 남기면 여기서 뭔가 더 할 수 있다고 읽힌다
    vi.spyOn(api, 'sharedRecording').mockResolvedValue(shared())
    renderPublic()
    await screen.findByText('8월 회의')

    expect(screen.queryByRole('button', { name: '김실명' })).toBeNull()
    expect(screen.queryByRole('button', { name: /공유/ })).toBeNull()
    expect(screen.queryByRole('link', { name: '라이브러리' })).toBeNull()
  })

  it('변환 중이면 기다리라고 말한다', async () => {
    // 두 시간짜리 회의를 올리고 바로 공유하면 받는 사람이 전사 전에 연다
    vi.spyOn(api, 'sharedRecording').mockResolvedValue(
      shared({ status: 'processing', segments: [], summary: null, progress: 0.4 }),
    )
    renderPublic()

    expect(await screen.findByText('아직 변환하는 중입니다.')).toBeInTheDocument()
    expect(screen.getByText('잠시 후 다시 열어 보세요.')).toBeInTheDocument()
  })

  it('오디오를 막은 링크에는 플레이어를 그리지 않는다', async () => {
    vi.spyOn(api, 'sharedRecording').mockResolvedValue(shared({ allow_audio: false }))
    renderPublic()
    await screen.findByText('8월 회의')

    expect(screen.queryByRole('button', { name: '재생' })).toBeNull()
  })

  it('없는 링크는 그렇게 말한다', async () => {
    vi.spyOn(api, 'sharedRecording').mockRejectedValue(
      new ApiError('링크가 유효하지 않습니다', 404),
    )
    renderPublic()

    expect(await screen.findByText('링크가 유효하지 않습니다')).toBeInTheDocument()
  })
})

describe('비밀번호 링크', () => {
  it('잠겨 있으면 잠금 해제 폼부터 보여준다', async () => {
    vi.spyOn(api, 'sharedRecording').mockRejectedValue(new ApiError('비밀번호가 필요합니다', 401))
    renderPublic()

    expect(await screen.findByText('비밀번호가 필요합니다')).toBeInTheDocument()
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument()
  })

  it('풀면 내용을 보여준다', async () => {
    const load = vi
      .spyOn(api, 'sharedRecording')
      .mockRejectedValue(new ApiError('비밀번호가 필요합니다', 401))
    vi.spyOn(api, 'unlockShared').mockResolvedValue(undefined)
    renderPublic()
    await screen.findByLabelText('비밀번호')

    load.mockResolvedValue(shared())
    await userEvent.type(screen.getByLabelText('비밀번호'), '열려라')
    await userEvent.click(screen.getByRole('button', { name: '열기' }))

    expect(await screen.findByText('안녕하세요')).toBeInTheDocument()
  })

  it('틀리면 그 자리에 알리고 남은 횟수는 말하지 않는다', async () => {
    vi.spyOn(api, 'sharedRecording').mockRejectedValue(new ApiError('비밀번호가 필요합니다', 401))
    vi.spyOn(api, 'unlockShared').mockRejectedValue(
      new ApiError('비밀번호가 올바르지 않습니다', 403),
    )
    renderPublic()
    await screen.findByLabelText('비밀번호')

    await userEvent.type(screen.getByLabelText('비밀번호'), '틀림')
    await userEvent.click(screen.getByRole('button', { name: '열기' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('비밀번호가 올바르지 않습니다')
    expect(alert.textContent).not.toMatch(/[0-9]회/)
  })
})

describe('오디오를 막은 링크', () => {
  it('눌러서 듣는 어포던스를 그리지 않는다', async () => {
    // 플레이어 바는 트랙이 없으면 원래 안 그려진다. 실제로 막아야 하는 것은 전사의
    // 재생 버튼이다 — 눌러도 아무 일이 없으면 무엇이 잘못됐는지 알 수 없다
    vi.spyOn(api, 'sharedRecording').mockResolvedValue(shared({ allow_audio: false }))
    renderPublic()
    await screen.findByText('안녕하세요')

    expect(screen.queryByTitle('이 구간부터 재생')).toBeNull()
  })

  it('허용한 링크에는 그린다', async () => {
    vi.spyOn(api, 'sharedRecording').mockResolvedValue(shared({ allow_audio: true }))
    renderPublic()
    await screen.findByText('안녕하세요')

    expect(screen.getByTitle('이 구간부터 재생')).toBeInTheDocument()
  })
})

describe('첫 화면', () => {
  it('응답을 기다리는 동안 링크가 깨졌다고 말하지 않는다', async () => {
    // useAsync는 첫 200ms 동안 loading이 false다. 그 사이를 걸러내지 않으면
    // 오류 화면이 한 번 스쳤다가 본문으로 바뀐다
    let settle: (value: SharedRecording) => void = () => {}
    vi.spyOn(api, 'sharedRecording').mockReturnValue(
      new Promise<SharedRecording>((resolve) => {
        settle = resolve
      }),
    )
    renderPublic()

    expect(screen.queryByText('링크가 유효하지 않습니다')).not.toBeInTheDocument()

    settle(shared())
    expect(await screen.findByText('8월 회의')).toBeInTheDocument()
    expect(screen.queryByText('링크가 유효하지 않습니다')).not.toBeInTheDocument()
  })
})
