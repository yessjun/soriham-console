import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../AuthProvider'
import { RequireAuth } from '../RequireAuth'
import PendingPage from '../../pages/PendingPage'
import LoginPage from '../../pages/LoginPage'
import { api, type Me } from '../../api'
import { PlayerProvider } from '../../player'
import { currentWorkspaceId } from '../../workspace'

function makeMe(overrides: Partial<Me> = {}): Me {
  return {
    user: { id: 'u1', email: 'me@example.test', name: '나' },
    status: 'active',
    workspaces: [
      { id: 'w1', name: '내 보관함', slug: 'mine', role: 'owner', capabilities: ['upload'] },
    ],
    default_workspace_id: 'w1',
    capabilities: [],
    pending_user_count: null,
    ...overrides,
  }
}

function renderApp(initial = '/') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <AuthProvider>
        <PlayerProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/pending" element={<PendingPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <p>보관함 내용</p>
              </RequireAuth>
            }
          />
        </Routes>
        </PlayerProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('세션 부트스트랩', () => {
  it('확인이 끝나기 전에 로그인 화면으로 보내지 않는다', async () => {
    let resolve: (me: Me) => void = () => {}
    vi.spyOn(api, 'me').mockReturnValue(new Promise<Me>((r) => (resolve = r)))
    renderApp()

    expect(screen.queryByRole('button', { name: '로그인' })).toBeNull()

    resolve(makeMe())
    expect(await screen.findByText('보관함 내용')).toBeInTheDocument()
  })

  it('확인 중에도 껍데기를 그린다', () => {
    vi.spyOn(api, 'me').mockReturnValue(new Promise<Me>(() => {}))
    renderApp()

    expect(screen.getByRole('heading', { name: '소리함' })).toBeInTheDocument()
  })

  it('세션이 없으면 로그인 화면으로 보낸다', async () => {
    vi.spyOn(api, 'me').mockRejectedValue(new Error('401'))
    renderApp()

    expect(await screen.findByRole('button', { name: '로그인' })).toBeInTheDocument()
  })

  it('기본 워크스페이스를 현재 값으로 잡는다', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(makeMe())
    renderApp()

    await screen.findByText('보관함 내용')
    expect(currentWorkspaceId()).toBe('w1')
  })
})

describe('승인 대기', () => {
  it('활성이 아니면 앱 대신 대기 화면을 준다', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(makeMe({ status: 'pending', workspaces: [] }))
    renderApp()

    expect(await screen.findByText('승인을 기다리는 중입니다')).toBeInTheDocument()
    expect(screen.queryByText('보관함 내용')).toBeNull()
  })

  it('대기 화면에 로그아웃이 있다', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(makeMe({ status: 'pending', workspaces: [] }))
    renderApp('/pending')

    expect(await screen.findByRole('button', { name: '로그아웃' })).toBeInTheDocument()
  })

  it('상태마다 다른 문구를 준다', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(makeMe({ status: 'disabled', workspaces: [] }))
    renderApp('/pending')

    expect(await screen.findByText('사용이 중지된 계정입니다')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '지금 다시 확인' })).toBeNull()
  })

  it('승인되면 앱으로 넘어간다', async () => {
    const me = vi.spyOn(api, 'me').mockResolvedValue(makeMe({ status: 'pending', workspaces: [] }))
    renderApp('/pending')
    await screen.findByText('승인을 기다리는 중입니다')

    me.mockResolvedValue(makeMe())
    await userEvent.click(screen.getByRole('button', { name: '지금 다시 확인' }))

    await waitFor(() => expect(screen.getByText('보관함 내용')).toBeInTheDocument())
  })
})

describe('로그인', () => {
  it('성공하면 앱으로 들어간다', async () => {
    vi.spyOn(api, 'me').mockRejectedValue(new Error('401'))
    vi.spyOn(api, 'login').mockResolvedValue(makeMe())
    renderApp()
    await screen.findByRole('button', { name: '로그인' })

    await userEvent.type(screen.getByLabelText('이메일'), 'me@example.test')
    await userEvent.type(screen.getByLabelText('비밀번호'), '암구호')
    await userEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByText('보관함 내용')).toBeInTheDocument()
  })

  it('대기 계정으로 로그인하면 대기 화면으로 간다', async () => {
    vi.spyOn(api, 'me').mockRejectedValue(new Error('401'))
    vi.spyOn(api, 'login').mockResolvedValue(makeMe({ status: 'pending', workspaces: [] }))
    renderApp()
    await screen.findByRole('button', { name: '로그인' })

    await userEvent.type(screen.getByLabelText('이메일'), 'wait@example.test')
    await userEvent.type(screen.getByLabelText('비밀번호'), '암구호')
    await userEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByText('승인을 기다리는 중입니다')).toBeInTheDocument()
  })

  it('실패하면 그 자리에 이유를 적는다', async () => {
    vi.spyOn(api, 'me').mockRejectedValue(new Error('401'))
    vi.spyOn(api, 'login').mockRejectedValue(new Error('이메일 또는 비밀번호가 올바르지 않습니다'))
    renderApp()
    await screen.findByRole('button', { name: '로그인' })

    await userEvent.type(screen.getByLabelText('이메일'), 'me@example.test')
    await userEvent.type(screen.getByLabelText('비밀번호'), '틀림')
    await userEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByText('이메일 또는 비밀번호가 올바르지 않습니다')).toBeInTheDocument()
  })
})
