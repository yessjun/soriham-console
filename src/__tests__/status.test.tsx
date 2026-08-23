import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { STATUSES, STATUS_COLOR, statusLabel } from '../status'
import { StatusBadge } from '../components/ui'

describe('상태 목록', () => {
  it('모든 상태에 색이 있다', () => {
    // 색이 없는 상태는 회색 배지로 떨어져 처리 중인지 실패인지 구분되지 않는다
    for (const status of STATUSES) {
      expect(STATUS_COLOR[status], status).toBeDefined()
    }
  })

  it('한도 초과는 고장이 아니라고 읽히게 적는다', () => {
    render(<StatusBadge status="quota_blocked" />)
    expect(screen.getByText('한도 초과')).toBeInTheDocument()
  })

  it('나머지 상태는 용어집 이름 그대로 쓴다', () => {
    expect(statusLabel('summarizing')).toBe('summarizing')
  })
})
