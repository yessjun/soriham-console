import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../AuthProvider'
import { RequireAuth } from '../RequireAuth'
import PendingPage from '../../pages/PendingPage'
import LoginPage from '../../pages/LoginPage'
import { api } from '../../api'
import type { Me } from '../../api'
import { PlayerProvider } from '../../player'
import { WorkspaceProvider } from '../WorkspaceProvider'
import { useWorkspaceId } from '../../workspace'

function makeMe(overrides: Partial<Me> = {}): Me {
  return {
    user: { id: 'u1', email: 'me@example.test', name: '나' },
    status: 'active',
    workspaces: [
      { id: 'w1', name: '내 보관함', slug: 'mine', role: 'owner', capabilities: ['upload'] },
      { id: 'w2', name: '팀 보관함', slug: 'team', role: 'member', capabilities: ['upload'] },
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
        <WorkspaceProvider>
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
        </WorkspaceProvider>
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
    // 제목만 보면 로그인 화면의 제목과 같아서, 잘못 리다이렉트해도 통과한다.
    // 사이드바에만 있는 것을 본다
    vi.spyOn(api, 'me').mockReturnValue(new Promise<Me>(() => {}))
    renderApp()

    expect(screen.getByRole('link', { name: '라이브러리' })).toBeInTheDocument()
  })

  it('세션이 없으면 로그인 화면으로 보낸다', async () => {
    vi.spyOn(api, 'me').mockRejectedValue(new Error('401'))
    renderApp()

    expect(await screen.findByRole('button', { name: '로그인' })).toBeInTheDocument()
  })

  it('기본 워크스페이스를 현재 값으로 잡는다', async () => {
    function Probe() {
      return <span data-testid="ws">{useWorkspaceId()}</span>
    }
    vi.spyOn(api, 'me').mockResolvedValue(makeMe({ default_workspace_id: 'w2' }))
    render(
      <MemoryRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <Probe />
          </WorkspaceProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByTestId('ws')).toHaveTextContent('w2')
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

describe('늦게 온 응답', () => {
  it('로그아웃 뒤에 도착한 조회가 세션을 되살리지 않는다', async () => {
    // 대기 화면의 폴링이 느린 사이 로그아웃하면, 늦은 응답이 앱으로 되돌려 놓는다
    let resolve: (me: Me) => void = () => {}
    vi.spyOn(api, 'me')
      .mockResolvedValueOnce(makeMe({ status: 'pending', workspaces: [] }))
      .mockReturnValue(new Promise<Me>((r) => (resolve = r)))
    vi.spyOn(api, 'logout').mockResolvedValue(undefined)
    renderApp('/pending')
    await screen.findByText('승인을 기다리는 중입니다')

    await userEvent.click(screen.getByRole('button', { name: '지금 다시 확인' }))
    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }))
    resolve(makeMe())

    await waitFor(() => expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument())
    expect(screen.queryByText('보관함 내용')).toBeNull()
  })

  it('확인이 끝나기 전에는 로그인 폼을 그리지 않는다', async () => {
    // 세션이 살아 있는 사람에게 로그인 폼이 스쳤다 사라진다. 그 창에서 제출하면
    // 늦게 온 부트스트랩 거부와 경쟁한다 — 폼을 안 그리면 그 창 자체가 없다
    let resolve: (me: Me) => void = () => {}
    vi.spyOn(api, 'me').mockReturnValue(new Promise<Me>((r) => (resolve = r)))
    renderApp('/login')

    expect(screen.queryByLabelText('이메일')).toBeNull()

    resolve(makeMe())
    await waitFor(() => expect(screen.getByText('보관함 내용')).toBeInTheDocument())
  })

  it('연결이 끊긴 것을 세션 없음으로 치지 않는다', async () => {
    // 대기 화면을 켜 둔 채 서버가 재시작하면 폴링이 실패한다. 그때 로그인 화면으로
    // 튕기면 세션이 멀쩡한데도 쫓겨난다
    const me = vi.spyOn(api, 'me').mockResolvedValue(makeMe({ status: 'pending', workspaces: [] }))
    renderApp('/pending')
    await screen.findByText('승인을 기다리는 중입니다')

    me.mockRejectedValue(new TypeError('Failed to fetch'))
    await userEvent.click(screen.getByRole('button', { name: '지금 다시 확인' }))

    await new Promise((r) => setTimeout(r, 0))
    expect(screen.getByText('승인을 기다리는 중입니다')).toBeInTheDocument()
  })
})

describe('세션이 중간에 끊기거나 막히면', () => {
  it('401을 받으면 로그인 화면으로 돌아간다', async () => {
    // 전송 층과 인증 상태를 잇는 배선. 없으면 만료가 화면에 나타나지 않는다
    vi.spyOn(api, 'me').mockResolvedValue(makeMe())
    renderApp()
    await screen.findByText('보관함 내용')

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: '로그인이 필요합니다' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )
    await act(async () => {
      await api.recording('r1').catch(() => {})
    })

    expect(await screen.findByRole('button', { name: '로그인' })).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('403을 받으면 상태를 다시 물어 대기 화면으로 간다', async () => {
    // 계정이 중지되면 세션은 살아 있고 호출만 403이 된다. 다시 묻지 않으면 화면이
    // 활성인 채로 남아 도달할 수 있는 곳이 없다
    const me = vi.spyOn(api, 'me').mockResolvedValue(makeMe())
    renderApp()
    await screen.findByText('보관함 내용')

    me.mockResolvedValue(makeMe({ status: 'disabled', workspaces: [] }))
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: '사용이 중지된 계정입니다' }), {
          status: 403,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )
    await act(async () => {
      await api.recording('r1').catch(() => {})
    })

    expect(await screen.findByText('사용이 중지된 계정입니다')).toBeInTheDocument()
    vi.unstubAllGlobals()
  })
})


describe('대기 화면 폴링', () => {
  it('1분마다 스스로 다시 확인한다', async () => {
    // 화면이 그렇게 적어 두었는데 검증이 없으면 등록을 지워도 아무도 울지 않는다
    vi.useFakeTimers()
    const me = vi.spyOn(api, 'me').mockResolvedValue(makeMe({ status: 'pending', workspaces: [] }))
    renderApp('/pending')
    await vi.waitFor(() => expect(screen.getByText('승인을 기다리는 중입니다')).toBeInTheDocument())
    const before = me.mock.calls.length

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })

    expect(me.mock.calls.length).toBeGreaterThan(before)
    vi.useRealTimers()
  })
})
