import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../../auth/AuthProvider'
import { WorkspaceProvider } from '../../auth/WorkspaceProvider'
import { UsageWarning } from '../UsageMeter'
import { api, type Me, type Usage } from '../../api'

function makeMe(): Me {
  return {
    user: { id: 'u1', email: 'me@example.test', name: '나' },
    status: 'active',
    workspaces: [{ id: 'w1', name: '내 보관함', slug: 'mine', role: 'owner', capabilities: [] }],
    default_workspace_id: 'w1',
    capabilities: [],
    pending_user_count: null,
  }
}

function usage(overrides: Partial<Usage>): Usage {
  return {
    used_minutes: 0,
    quota_minutes: null,
    used_bytes: 0,
    quota_bytes: null,
    window_days: 30,
    ...overrides,
  }
}

function renderWarning() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <WorkspaceProvider>
          <UsageWarning />
        </WorkspaceProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('한도 경고', () => {
  it('전사 시간은 지워서 푸는 것이 아니라고 말한다', async () => {
    // 사용 이력은 녹음 삭제를 살아남는다. 지우라고 안내하면 지워도 안 풀린다
    vi.spyOn(api, 'me').mockResolvedValue(makeMe())
    vi.spyOn(api, 'usage').mockResolvedValue(usage({ used_minutes: 90, quota_minutes: 100 }))
    renderWarning()

    expect(await screen.findByText(/시간이 지나면 풀립니다/)).toBeInTheDocument()
    expect(screen.queryByText(/지우면 돌아옵니다/)).toBeNull()
  })

  it('저장 공간은 지우면 돌아온다고 말한다', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(makeMe())
    vi.spyOn(api, 'usage').mockResolvedValue(
      usage({ used_bytes: 9_000_000_000, quota_bytes: 10_000_000_000 }),
    )
    renderWarning()

    expect(await screen.findByText(/지우면 돌아옵니다/)).toBeInTheDocument()
  })
})
