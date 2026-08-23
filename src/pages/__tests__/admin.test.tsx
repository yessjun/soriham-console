import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../../auth/AuthProvider'
import { WorkspaceProvider } from '../../auth/WorkspaceProvider'
import { RequireAuth } from '../../auth/RequireAuth'
import { PlayerProvider } from '../../player'
import AdminPage from '../AdminPage'
import { api, type Account, type Me } from '../../api'

function makeMe(overrides: Partial<Me> = {}): Me {
  return {
    user: { id: 'u1', email: 'admin@example.test', name: '운영자' },
    status: 'active',
    workspaces: [
      { id: 'w1', name: '내 보관함', slug: 'mine', role: 'owner', capabilities: ['upload'] },
    ],
    default_workspace_id: 'w1',
    capabilities: ['admin', 'create_workspace'],
    pending_user_count: 2,
    ...overrides,
  }
}

function account(overrides: Partial<Account> = {}): Account {
  return {
    id: 'a1',
    email: 'new@example.test',
    name: '신청자',
    status: 'pending',
    signup_note: '같이 쓰고 싶습니다',
    requested_at: '2026-08-23T00:00:00Z',
    ...overrides,
  }
}

function renderAdmin() {
  return render(
    <MemoryRouter initialEntries={['/settings/admin']}>
      <AuthProvider>
        <WorkspaceProvider>
          <PlayerProvider>
            <Routes>
              <Route
                path="/settings/admin"
                element={
                  <RequireAuth>
                    <AdminPage />
                  </RequireAuth>
                }
              />
            </Routes>
          </PlayerProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('계정 관리', () => {
  it('대기 목록과 남긴 말을 보여준다', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(makeMe())
    vi.spyOn(api, 'accounts').mockResolvedValue([account()])
    renderAdmin()

    expect(await screen.findByText('신청자')).toBeInTheDocument()
    expect(screen.getByText('같이 쓰고 싶습니다')).toBeInTheDocument()
  })

  it('승인은 확인을 거친다', async () => {
    // 확인 없이 실행되는 파괴적 동작을 두지 않는다는 규칙이 여기에도 적용된다
    vi.spyOn(api, 'me').mockResolvedValue(makeMe())
    vi.spyOn(api, 'accounts').mockResolvedValue([account()])
    const change = vi.spyOn(api, 'setAccountStatus').mockResolvedValue(makeMe())
    renderAdmin()
    await screen.findByText('신청자')

    await userEvent.click(screen.getByRole('button', { name: '승인' }))
    expect(change).not.toHaveBeenCalled()

    await userEvent.click(screen.getAllByRole('button', { name: '승인' })[1])

    await waitFor(() => expect(change).toHaveBeenCalledWith('a1', 'active'))
  })

  it('거절은 사라지는 것을 미리 알린다', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(makeMe())
    vi.spyOn(api, 'accounts').mockResolvedValue([account()])
    renderAdmin()
    await screen.findByText('신청자')

    await userEvent.click(screen.getByRole('button', { name: '거절' }))

    expect(
      await screen.findByText('거절하면 그 사람의 빈 개인 워크스페이스가 함께 사라집니다.'),
    ).toBeInTheDocument()
  })

  it('중지는 세션이 끊긴다는 것을 미리 알린다', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(makeMe())
    const accounts = vi.spyOn(api, 'accounts').mockResolvedValue([])
    renderAdmin()
    await screen.findByText('기다리는 신청이 없습니다')

    accounts.mockResolvedValue([account({ status: 'active', signup_note: null })])
    await userEvent.click(screen.getByRole('button', { name: '사용 중' }))
    await screen.findByText('신청자')
    await userEvent.click(screen.getByRole('button', { name: '중지' }))

    expect(
      await screen.findByText('중지하면 지금 열려 있는 세션이 모두 끊깁니다.'),
    ).toBeInTheDocument()
  })

  it('거절된 계정도 골라 볼 수 있다', async () => {
    // 대기만 볼 수 있으면 거절을 되돌릴 방법이 없다
    vi.spyOn(api, 'me').mockResolvedValue(makeMe())
    const accounts = vi.spyOn(api, 'accounts').mockResolvedValue([])
    renderAdmin()
    await screen.findByText('기다리는 신청이 없습니다')

    accounts.mockResolvedValue([account({ status: 'rejected', signup_note: null })])
    await userEvent.click(screen.getByRole('button', { name: '거절됨' }))

    expect(await screen.findByRole('button', { name: '거절 취소' })).toBeInTheDocument()
    expect(accounts).toHaveBeenCalledWith('rejected')
  })

  it('상태를 바꾸면 대기 인원을 다시 읽는다', async () => {
    // 배지는 내 정보에 실려 온다. 안 다시 읽으면 승인해도 숫자가 그대로다
    const me = vi.spyOn(api, 'me').mockResolvedValue(makeMe())
    vi.spyOn(api, 'accounts').mockResolvedValue([account()])
    vi.spyOn(api, 'setAccountStatus').mockResolvedValue(makeMe({ pending_user_count: 1 }))
    renderAdmin()
    await screen.findByText('신청자')
    const before = me.mock.calls.length

    await userEvent.click(screen.getByRole('button', { name: '승인' }))
    await userEvent.click(screen.getAllByRole('button', { name: '승인' })[1])

    await waitFor(() => expect(me.mock.calls.length).toBeGreaterThan(before))
  })
})

describe('사이드바', () => {
  it('서비스 관리자에게만 계정 관리를 보여준다', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(makeMe())
    vi.spyOn(api, 'accounts').mockResolvedValue([])
    renderAdmin()

    expect(await screen.findByRole('link', { name: /계정 관리/ })).toBeInTheDocument()
  })

  it('대기 인원을 배지로 알린다', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(makeMe({ pending_user_count: 3 }))
    vi.spyOn(api, 'accounts').mockResolvedValue([])
    renderAdmin()

    const link = await screen.findByRole('link', { name: /계정 관리/ })
    expect(link).toHaveTextContent('3')
  })

  it('기다리는 사람이 없으면 배지를 그리지 않는다', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(makeMe({ pending_user_count: 0 }))
    vi.spyOn(api, 'accounts').mockResolvedValue([])
    renderAdmin()

    const link = await screen.findByRole('link', { name: /계정 관리/ })
    expect(link).not.toHaveTextContent('0')
  })
})
