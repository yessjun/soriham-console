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
        // 백드롭 클릭은 두 가지가 동시에 참이어야 한다.
        //
        // 하나, 이벤트 대상이 dialog 자신일 것. 안쪽 버튼을 키보드로 누르면 브라우저가
        // 좌표 0인 click을 만드는데, 좌표만 보면 그것이 판 밖으로 판정돼 실행과 동시에
        // 판이 닫힌다 — 삭제 실패 문구가 닫힌 판 안에서 사라진다.
        //
        // 둘, 좌표가 판 밖일 것. dialog가 패딩을 갖고 있어 대상만 보면 판 안쪽
        // 가장자리를 눌러도 닫혀 쓰던 입력이 통째로 날아간다.
        if (event.target !== ref.current) return
        const box = ref.current.getBoundingClientRect()
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
