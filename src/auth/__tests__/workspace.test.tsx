import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../AuthProvider'
import { WorkspaceProvider } from '../WorkspaceProvider'
import { RequireAuth } from '../RequireAuth'
import { PlayerProvider } from '../../player'
import { api, type Me, type RecordingList } from '../../api'
import { useWorkspaceId } from '../../workspace'
import { useAsync } from '../../hooks'

function makeMe(): Me {
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
  }
}

function emptyList(): RecordingList {
  return { items: [], total: 0 }
}

/** 라이브러리처럼 워크스페이스 범위로 조회하는 화면 */
function Listing() {
  const workspaceId = useWorkspaceId()
  const query = useAsync(() => api.listRecordings(workspaceId, {}), [workspaceId])
  return <p>총 {query.data?.total ?? 0}건</p>
}

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <WorkspaceProvider>
          <PlayerProvider>
            <Routes>
              <Route
                path="/"
                element={
                  <RequireAuth>
                    <Listing />
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

describe('워크스페이스 전환', () => {
  it('같은 화면에 머물러도 목록을 다시 불러온다', async () => {
    // 라우트가 안 바뀌면 화면이 리마운트되지 않는다. 이전 워크스페이스의 목록이
    // 새 이름표를 단 채 남는 것이 이 자리의 실패다
    vi.spyOn(api, 'me').mockResolvedValue(makeMe())
    const list = vi.spyOn(api, 'listRecordings').mockResolvedValue(emptyList())
    renderApp()
    await screen.findByText('총 0건')
    expect(list).toHaveBeenCalledWith('w1', {})

    await userEvent.click(screen.getByRole('button', { name: /워크스페이스/ }))
    await userEvent.click(screen.getByRole('menuitem', { name: '팀 보관함' }))

    await waitFor(() => expect(list).toHaveBeenCalledWith('w2', {}))
  })

  it('전환하면 사이드바 이름도 바뀐다', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(makeMe())
    vi.spyOn(api, 'listRecordings').mockResolvedValue(emptyList())
    renderApp()
    await screen.findByText('총 0건')

    await userEvent.click(screen.getByRole('button', { name: /워크스페이스/ }))
    await userEvent.click(screen.getByRole('menuitem', { name: '팀 보관함' }))

    expect(await screen.findByRole('button', { name: '워크스페이스: 팀 보관함' })).toBeInTheDocument()
  })
})
