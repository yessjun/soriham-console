import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShareDialog } from '../ShareDialog'
import { api, type SharePanel } from '../../api'

function panel(overrides: Partial<SharePanel> = {}): SharePanel {
  return { users: [], links: [], workspace_name: '내 보관함', ...overrides }
}

function open() {
  return render(<ShareDialog recordingId="r1" open onClose={() => {}} />)
}

beforeEach(() => {
  vi.restoreAllMocks()
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
})

describe('사람 공유', () => {
  it('이메일과 권한으로 공유한다', async () => {
    vi.spyOn(api, 'sharePanel').mockResolvedValue(panel())
    const add = vi.spyOn(api, 'addShare').mockResolvedValue({
      id: 's1',
      email: 'friend@example.test',
      name: null,
      permission: 'edit',
      pending: true,
    })
    open()
    await screen.findByRole('heading', { name: '사람' })

    await userEvent.type(screen.getByLabelText('이메일'), 'friend@example.test')
    await userEvent.selectOptions(screen.getByLabelText('권한'), 'edit')
    await userEvent.click(screen.getByRole('button', { name: '공유' }))

    expect(add).toHaveBeenCalledWith('r1', 'friend@example.test', 'edit')
  })

  it('가입 전 이메일임을 알린다', async () => {
    vi.spyOn(api, 'sharePanel').mockResolvedValue(
      panel({
        users: [
          { id: 's1', email: 'later@example.test', name: null, permission: 'view', pending: true },
        ],
      }),
    )
    open()

    expect(await screen.findByText('가입하면 연결됩니다')).toBeInTheDocument()
  })

  it('해제는 확인을 거친다', async () => {
    vi.spyOn(api, 'sharePanel').mockResolvedValue(
      panel({
        users: [
          { id: 's1', email: 'f@example.test', name: '친구', permission: 'view', pending: false },
        ],
      }),
    )
    const remove = vi.spyOn(api, 'removeShare').mockResolvedValue(undefined)
    open()
    await screen.findByText('친구')

    await userEvent.click(screen.getByRole('button', { name: 'f@example.test 공유 해제' }))
    expect(remove).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: '해제하기' }))

    await waitFor(() => expect(remove).toHaveBeenCalledWith('r1', 's1'))
  })
})

describe('링크 공유', () => {
  it('선택한 잠금과 만료로 발급한다', async () => {
    vi.spyOn(api, 'sharePanel').mockResolvedValue(panel())
    const create = vi.spyOn(api, 'createLink').mockResolvedValue({
      id: 'l1',
      label: null,
      has_password: true,
      allow_audio: false,
      allow_speaker_names: true,
      expires_at: null,
      view_count: 0,
      last_viewed_at: null,
      created_at: '2026-08-24T00:00:00Z',
      token: 'tok',
    })
    open()
    await screen.findByRole('heading', { name: '링크' })

    await userEvent.type(screen.getByLabelText('비밀번호 (선택)'), '열려라')
    await userEvent.click(screen.getByLabelText('오디오 재생 허용'))
    await userEvent.selectOptions(screen.getByLabelText('만료'), 'none')
    await userEvent.click(screen.getByRole('button', { name: '링크 만들기' }))

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith('r1', {
        label: undefined,
        password: '열려라',
        allow_audio: false,
        allow_speaker_names: true,
        expires_in_days: null,
      }),
    )
  })

  it('발급한 주소는 그 자리에서만 보여준다', async () => {
    // 원문 토큰은 발급 응답에만 실린다. 다시 볼 수 없다는 것을 알려야 한다
    vi.spyOn(api, 'sharePanel').mockResolvedValue(panel())
    vi.spyOn(api, 'createLink').mockResolvedValue({
      id: 'l1',
      label: null,
      has_password: false,
      allow_audio: true,
      allow_speaker_names: true,
      expires_at: null,
      view_count: 0,
      last_viewed_at: null,
      created_at: '2026-08-24T00:00:00Z',
      token: 'tok',
    })
    open()
    await screen.findByRole('heading', { name: '링크' })

    await userEvent.click(screen.getByRole('button', { name: '링크 만들기' }))

    expect(await screen.findByText(/다시 보여 주지 않습니다/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '링크 복사' }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('/s/tok'),
    )
  })

  it('잠금 상태를 목록에 적는다', async () => {
    vi.spyOn(api, 'sharePanel').mockResolvedValue(
      panel({
        links: [
          {
            id: 'l1',
            label: '팀 공유',
            has_password: true,
            allow_audio: false,
            allow_speaker_names: false,
            expires_at: null,
            view_count: 3,
            last_viewed_at: null,
            created_at: '2026-08-24T00:00:00Z',
          },
        ],
      }),
    )
    open()

    expect(await screen.findByText(/비밀번호 있음/)).toBeInTheDocument()
    expect(screen.getByText(/오디오 잠금/)).toBeInTheDocument()
    expect(screen.getByText(/화자 이름 숨김/)).toBeInTheDocument()
  })

  it('철회는 확인을 거친다', async () => {
    vi.spyOn(api, 'sharePanel').mockResolvedValue(
      panel({
        links: [
          {
            id: 'l1',
            label: '팀 공유',
            has_password: false,
            allow_audio: true,
            allow_speaker_names: true,
            expires_at: null,
            view_count: 0,
            last_viewed_at: null,
            created_at: '2026-08-24T00:00:00Z',
          },
        ],
      }),
    )
    const revoke = vi.spyOn(api, 'revokeLink').mockResolvedValue(undefined)
    open()
    await screen.findByText(/팀 공유/)

    await userEvent.click(screen.getByRole('button', { name: '팀 공유 철회' }))
    await userEvent.click(screen.getByRole('button', { name: '철회하기' }))

    await waitFor(() => expect(revoke).toHaveBeenCalledWith('r1', 'l1'))
  })
})

describe('세 갈래를 함께', () => {
  it('워크스페이스 구성원이 이미 본다는 것을 알린다', async () => {
    vi.spyOn(api, 'sharePanel').mockResolvedValue(panel({ workspace_name: '팀 보관함' }))
    open()

    expect(await screen.findByText(/팀 보관함의 구성원은 이미 볼 수 있습니다/)).toBeInTheDocument()
  })

  it('닫혀 있으면 부르지 않는다', () => {
    const fetchPanel = vi.spyOn(api, 'sharePanel').mockResolvedValue(panel())
    render(<ShareDialog recordingId="r1" open={false} onClose={() => {}} />)

    expect(fetchPanel).not.toHaveBeenCalled()
  })
})
