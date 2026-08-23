import { useEffect, useRef, type ReactNode } from 'react'

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
      // Escape와 백드롭 클릭이 모두 이 이벤트로 온다
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        // dialog 자신이 대상이면 백드롭을 누른 것이다. 내용은 자식이 받는다
        if (event.target === ref.current) onClose()
      }}
      className="m-auto rounded-[14px] bg-surface-raised p-6 text-text shadow-3 backdrop:bg-black/40"
      style={{ width }}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 text-sm">{children}</div>
      {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
    </dialog>
  )
}
