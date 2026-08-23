import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  // 기본 480, 공유 화면은 560
  width?: number
}

/**
 * 네이티브 dialog 요소를 쓴다.
 *
 * 포커스 트랩, Escape 닫기, 배경 비활성, top-layer가 전부 따라온다. 직접 만들면
 * 그중 하나는 빠지고, 빠진 것이 무엇인지는 키보드로 쓰는 사람만 알게 된다.
 */
export function Modal({ open, onClose, title, children, footer, width = 480 }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      // Escape가 이 이벤트로 온다. 백드롭 클릭은 아래 onClick이 받는다
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        // 판 밖을 눌렀는지 좌표로 본다. event.target으로 보면 dialog 자신의 패딩,
        // 그러니까 판 안쪽 가장자리를 눌러도 닫혀 쓰던 입력이 통째로 날아간다
        const box = ref.current?.getBoundingClientRect()
        if (!box) return
        const outside =
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        if (outside) onClose()
      }}
      className="m-auto rounded-[14px] bg-surface-raised p-6 text-text shadow-[var(--shadow-3)] backdrop:bg-[rgb(28_27_26_/_0.4)]"
      style={{ width }}
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {!footer && (
          // 액션 줄이 없는 판은 Escape와 바깥 클릭 말고는 닫는 길이 없다
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="-m-1 rounded-[6px] p-1 text-text-tertiary transition-colors duration-120 hover:bg-bg hover:text-text"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        )}
      </div>
      <div className="mt-4 text-sm">{children}</div>
      {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
    </dialog>
  )
}
