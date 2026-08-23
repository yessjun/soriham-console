import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../../auth/AuthProvider'
import { WorkspaceProvider } from '../../auth/WorkspaceProvider'
import { RequireAuth } from '../../auth/RequireAuth'
import { UploadProvider } from '../../components/Uploader'
import { PlayerProvider } from '../../player'
import SharedPage from '../SharedPage'
import LibraryPage from '../LibraryPage'
import DetailPage from '../DetailPage'
import { api, type Me, type RecordingDetail, type SharedWithMe } from '../../api'

function makeMe(capabilities: string[] = ['upload']): Me {
  return {
    user: { id: 'u1', email: 'me@example.test', name: '나' },
    status: 'active',
    workspaces: [{ id: 'w1', name: '내 보관함', slug: 'mine', role: 'owner', capabilities }],
    default_workspace_id: 'w1',
    capabilities: [],
    pending_user_count: null,
  }
}

function shared(overrides: Partial<SharedWithMe> = {}): SharedWithMe {
  return {
    id: 'r1',
    filename: 'a.wav',
    title: '친구 회의',
    summary: null,
    recorded_at: '2026-08-20T00:00:00Z',
    duration_sec: 600,
    source: 'upload',
    size_bytes: 1000,
    status: 'done',
    language: 'ko',
    tags: [],
    progress: null,
    eta_sec: null,
    permission: 'view',
    shared_by: '친구',
    ...overrides,
  }
}

function renderAt(path: string, element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <WorkspaceProvider>
          <PlayerProvider>
            <UploadProvider>
              <Routes>
                <Route path={path} element={<RequireAuth>{element}</RequireAuth>} />
              </Routes>
            </UploadProvider>
          </PlayerProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('나에게 공유됨', () => {
  it('공유한 사람과 권한을 함께 보여준다', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(makeMe())
    vi.spyOn(api, 'sharedWithMe').mockResolvedValue({
      items: [shared({ permission: 'edit' })],
      total: 1,
    })
    renderAt('/shared', <SharedPage />)

    expect(await screen.findByText('친구 회의')).toBeInTheDocument()
    expect(screen.getByText(/친구가 공유/)).toBeInTheDocument()
    expect(screen.getByText(/편집 가능/)).toBeInTheDocument()
  })

  it('없으면 그 사실을 말한다', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(makeMe())
    vi.spyOn(api, 'sharedWithMe').mockResolvedValue({ items: [], total: 0 })
    renderAt('/shared', <SharedPage />)

    expect(await screen.findByText('아직 공유받은 녹음이 없습니다')).toBeInTheDocument()
  })

  it('사이드바에서 갈 수 있다', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(makeMe())
    vi.spyOn(api, 'sharedWithMe').mockResolvedValue({ items: [], total: 0 })
    renderAt('/shared', <SharedPage />)

    expect(await screen.findByRole('link', { name: /나에게 공유됨/ })).toBeInTheDocument()
  })
})

describe('업로드 어포던스', () => {
  it('올릴 수 있는 사람에게만 버튼을 그린다', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(makeMe(['upload']))
    vi.spyOn(api, 'listRecordings').mockResolvedValue({ items: [], total: 0 })
    renderAt('/', <LibraryPage />)

    expect(await screen.findByRole('button', { name: /업로드/ })).toBeInTheDocument()
  })

  it('열람자에게는 아예 그리지 않는다', async () => {
    // 비활성으로 남기면 왜 안 되는지 알 길이 없다
    vi.spyOn(api, 'me').mockResolvedValue(makeMe([]))
    vi.spyOn(api, 'listRecordings').mockResolvedValue({ items: [], total: 0 })
    renderAt('/', <LibraryPage />)

    await screen.findByRole('heading', { name: '라이브러리' })
    expect(screen.queryByRole('button', { name: /업로드/ })).toBeNull()
  })
})

function detail(overrides: Partial<RecordingDetail> = {}): RecordingDetail {
  return {
    ...shared(),
    can_edit: false,
    can_manage: false,
    share_state: null,
    error: null,
    stt_meta: null,
    speaker_names: {},
    segments: [],
    tags: [{ id: 't1', name: '회의' }],
    ...overrides,
  }
}

describe('공유받은 녹음의 편집 어포던스', () => {
  it('열람 전용이면 제목과 태그 편집을 그리지 않는다', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(makeMe())
    vi.spyOn(api, 'recording').mockResolvedValue(detail())
    renderAt('/recordings/r1', <DetailPage />)

    expect(await screen.findByText('친구 회의')).toBeInTheDocument()
    expect(screen.getByText('회의')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '제목 수정' })).toBeNull()
    expect(screen.queryByRole('button', { name: /태그 회의 제거/ })).toBeNull()
    expect(screen.queryByRole('button', { name: '태그' })).toBeNull()
  })

  it('편집 권한이 있으면 그린다', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(makeMe())
    vi.spyOn(api, 'recording').mockResolvedValue(detail({ can_edit: true }))
    renderAt('/recordings/r1', <DetailPage />)

    expect(await screen.findByRole('button', { name: '제목 수정' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /태그 회의 제거/ })).toBeInTheDocument()
  })
})
