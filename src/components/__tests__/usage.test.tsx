import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { UsageWarning } from '../UsageMeter'
import { WorkspaceContext } from '../../workspace'
import { api, type Usage } from '../../api'

function usage(overrides: Partial<Usage> = {}): Usage {
  return {
    used_minutes: 100,
    quota_minutes: 600,
    used_bytes: 1024 ** 3,
    quota_bytes: 20 * 1024 ** 3,
    window_days: 30,
    ...overrides,
  }
}

function renderMeter() {
  return render(
    <WorkspaceContext
      value={{
        current: { id: 'w1', name: '내 보관함', slug: 'mine', role: 'owner', capabilities: [] },
        workspaces: [],
        select: () => {},
      }}
    >
      <UsageWarning />
    </WorkspaceContext>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('사용량 경고', () => {
  it('여유가 있으면 아무것도 그리지 않는다', async () => {
    // 늘 띄우면 아무도 안 읽고, 정작 찼을 때도 안 읽는다
    vi.spyOn(api, 'usage').mockResolvedValue(usage())
    const { container } = renderMeter()

    await waitFor(() => expect(api.usage).toHaveBeenCalled())
    expect(container.textContent).toBe('')
  })

  it('전사 시간이 80%를 넘으면 알린다', async () => {
    vi.spyOn(api, 'usage').mockResolvedValue(usage({ used_minutes: 500 }))
    renderMeter()

    expect(await screen.findByText(/전사 시간 500분 \/ 600분/)).toBeInTheDocument()
  })

  it('저장 공간이 80%를 넘으면 알린다', async () => {
    vi.spyOn(api, 'usage').mockResolvedValue(usage({ used_bytes: 17 * 1024 ** 3 }))
    renderMeter()

    expect(await screen.findByText(/저장 공간 17.0GB \/ 20.0GB/)).toBeInTheDocument()
  })

  it('무제한이면 알리지 않는다', async () => {
    // 소유자의 스캔 워크스페이스가 이 상태다
    vi.spyOn(api, 'usage').mockResolvedValue(
      usage({ quota_minutes: null, quota_bytes: null, used_minutes: 100000 }),
    )
    const { container } = renderMeter()

    await waitFor(() => expect(api.usage).toHaveBeenCalled())
    expect(container.textContent).toBe('')
  })
})
