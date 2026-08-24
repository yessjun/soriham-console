import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Avatar } from '../Avatar'
import { Button } from '../Button'
import { ConfirmDialog } from '../ConfirmDialog'
import { CopyButton } from '../CopyButton'
import { Input } from '../Input'
import { Menu } from '../Menu'
import { Modal } from '../Modal'

describe('Button', () => {
  it('처리 중에는 눌리지 않는다', async () => {
    const onClick = vi.fn()
    render(
      <Button busy onClick={onClick}>
        저장
      </Button>,
    )

    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    expect(onClick).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })

  it('기본 타입이 submit이 아니다', () => {
    // 폼 안에 놓은 보조 버튼이 폼을 제출해 버리는 사고를 막는다
    render(<Button>버튼</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })
})

describe('Input', () => {
  it('한글 조합 중의 Enter는 확정으로 치지 않는다', () => {
    // 조합 중 Enter는 조합을 끝내는 키다. 이걸 확정으로 받으면 "안녕"을 치다가
    // "안"에서 제출된다
    const onEnter = vi.fn()
    render(<Input name="q" onEnter={onEnter} />)
    const input = screen.getByRole('textbox')

    fireEvent.compositionStart(input)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onEnter).not.toHaveBeenCalled()

    fireEvent.compositionEnd(input)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onEnter).toHaveBeenCalledOnce()
  })

  it('브라우저가 조합 신호를 isComposing으로만 줘도 막는다', () => {
    const onEnter = vi.fn()
    render(<Input name="q" onEnter={onEnter} />)

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', isComposing: true })

    expect(onEnter).not.toHaveBeenCalled()
  })

  it('오류를 입력과 연결한다', () => {
    render(<Input name="email" label="이메일" error="형식이 올바르지 않습니다" />)
    const input = screen.getByLabelText('이메일')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('형식이 올바르지 않습니다')
  })
})

describe('Modal', () => {
  it('열림 상태를 dialog 요소에 반영한다', () => {
    const { rerender } = render(
      <Modal open={false} onClose={() => {}} title="공유">
        내용
      </Modal>,
    )
    expect(screen.getByRole('dialog', { hidden: true })).not.toHaveAttribute('open')

    rerender(
      <Modal open onClose={() => {}} title="공유">
        내용
      </Modal>,
    )
    expect(screen.getByRole('dialog')).toHaveAttribute('open')
  })

  it('Escape로 닫으면 알려준다', () => {
    // 네이티브 dialog는 Escape를 cancel 이벤트로 준다. 이걸 안 받으면 화면은
    // 닫히는데 상태는 열린 채로 남는다
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="공유">
        내용
      </Modal>,
    )

    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))

    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('ConfirmDialog', () => {
  it('기본 포커스가 취소에 있다', () => {
    // 파괴적 동작이라 습관적으로 엔터를 누르는 손을 막는다
    render(
      <ConfirmDialog
        open
        title="녹음과 전사를 지웁니다"
        confirmLabel="지우기"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: '취소' })).toHaveFocus()
  })

  it('실행 버튼 문구를 그대로 쓴다', () => {
    render(
      <ConfirmDialog
        open
        title="링크를 철회합니다"
        confirmLabel="철회하기"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: '철회하기' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '확인' })).toBeNull()
  })
})

describe('Menu', () => {
  it('키보드로 이동하고 실행한다', async () => {
    const onSelect = vi.fn()
    render(
      <Menu
        label="계정"
        trigger="열기"
        items={[
          { label: '설정', onSelect: () => {} },
          { label: '로그아웃', onSelect },
        ]}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: '계정' }))
    await userEvent.keyboard('{ArrowDown}{Enter}')

    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('Escape로 닫는다', async () => {
    render(<Menu label="계정" trigger="열기" items={[{ label: '설정', onSelect: () => {} }]} />)

    await userEvent.click(screen.getByRole('button', { name: '계정' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('항목을 눌러 닫아도 포커스가 사라지지 않는다', async () => {
    // 누른 항목이 사라지면서 포커스가 문서 처음으로 튄다. 다음 Tab이 화면 맨 위에서
    // 시작하므로 키보드로 쓰는 사람은 위치를 잃는다
    render(<Menu label="계정" trigger="열기" items={[{ label: '설정', onSelect: () => {} }]} />)
    const trigger = screen.getByRole('button', { name: '계정' })

    await userEvent.click(trigger)
    await userEvent.click(screen.getByRole('menuitem', { name: '설정' }))

    expect(screen.queryByRole('menu')).toBeNull()
    expect(trigger).toHaveFocus()
  })
})

describe('Avatar', () => {
  it('이름이 없으면 이메일 첫 글자를 쓴다', () => {
    render(<Avatar name="  " email="friend@example.com" />)
    expect(screen.getByText('f')).toBeInTheDocument()
  })

  it('같은 이름은 같은 색을 받는다', () => {
    const { container } = render(
      <>
        <Avatar name="검증" />
        <Avatar name="검증" />
      </>,
    )
    const [a, b] = [...container.querySelectorAll('span')]
    expect(a.className).toBe(b.className)
  })
})

describe('CopyButton', () => {
  it('복사하면 버튼이 결과를 보여준다', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<CopyButton value="https://example.test/s/abc" />)

    await userEvent.click(screen.getByRole('button', { name: '복사' }))

    expect(writeText).toHaveBeenCalledWith('https://example.test/s/abc')
    expect(await screen.findByText('복사함')).toBeInTheDocument()
  })

  it('클립보드가 막히면 직접 고를 수 있게 내놓는다', async () => {
    // 실패했는데 아무 표시가 없으면 눌렀는지도 알 수 없다
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    render(<CopyButton value="토큰" />)

    await userEvent.click(screen.getByRole('button', { name: '복사' }))

    const field = await screen.findByLabelText('복사 (직접 선택)')
    expect(field).toHaveValue('토큰')
  })
})

describe('상태를 들고 쓰는 흐름', () => {
  it('확인 다이얼로그가 취소되면 열림 상태가 풀린다', async () => {
    function Harness() {
      const [open, setOpen] = useState(true)
      return (
        <ConfirmDialog
          open={open}
          title="지웁니다"
          confirmLabel="지우기"
          onConfirm={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      )
    }
    render(<Harness />)

    await userEvent.click(screen.getByRole('button', { name: '취소' }))

    expect(screen.getByRole('dialog', { hidden: true })).not.toHaveAttribute('open')
  })
})

describe('모달의 닫는 길', () => {
  it('판 안쪽 가장자리를 눌러도 닫히지 않는다', async () => {
    // dialog 자신이 패딩을 갖고 있어 event.target으로 보면 판 안쪽도 백드롭이 된다.
    // 공유 판에서는 쓰던 이메일과 링크 설정이 통째로 날아간다
    const closed: string[] = []
    render(
      <Modal open title="공유" onClose={() => closed.push('닫힘')}>
        <p>내용</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog', { hidden: true })
    dialog.getBoundingClientRect = () =>
      ({ left: 100, right: 500, top: 100, bottom: 400 }) as DOMRect

    fireEvent.click(dialog, { clientX: 110, clientY: 110 })
    expect(closed).toEqual([])

    fireEvent.click(dialog, { clientX: 10, clientY: 10 })
    expect(closed).toEqual(['닫힘'])
  })

  it('액션 줄이 없으면 닫기 버튼을 준다', () => {
    render(
      <Modal open title="공유" onClose={() => {}}>
        <p>내용</p>
      </Modal>,
    )
    expect(screen.getByRole('button', { name: '닫기' })).toBeInTheDocument()
  })
})

describe('Input의 배치 클래스', () => {
  it('바깥 상자가 받는다', () => {
    // 안쪽 input에 붙이면 세로 flex 자식이 되어 높이가 눌린다. 공유 판의 이메일 칸이
    // 옆 버튼은 36인데 혼자 18로 찌그러져 있었다
    const { container } = render(<Input name="q" label="이메일" wrapperClassName="flex-1" />)
    const input = screen.getByLabelText('이메일')

    expect(input.className).not.toContain('flex-1')
    expect(container.querySelector('.flex-1')).toContainElement(input)
    expect(input.className).toContain('h-9')
    expect(input.className).toContain('w-full')
  })
})
