import { useEffect, useRef } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'

type Props = {
  open: boolean
  title: string
  // 무엇이 사라지는지 적는다. 되돌릴 수 없으면 그렇게 적는다
  description?: string
  // 동사로 적는다. "확인"이라고 쓰지 않는다
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
  /** 무언가 사라지는 확인이 아니면 false. 승인처럼 되돌릴 수 있는 것이 그렇다 */
  destructive?: boolean
  /** 실행이 실패했을 때. 뒤 화면에 그리면 모달에 가려 보이지 않는다 */
  error?: string
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  busy = false,
  destructive = true,
  error,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  // 파괴적 동작의 기본 포커스는 취소에 둔다. 엔터를 습관적으로 누르는 손을 막는다
  useEffect(() => {
    if (open && destructive) cancelRef.current?.focus()
  }, [open, destructive])

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      width={400}
      footer={
        <>
          <Button ref={cancelRef} onClick={onCancel} disabled={busy}>
            취소
          </Button>
          <Button variant={destructive ? 'destructive' : 'primary'} onClick={onConfirm} busy={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description && <p className="text-text-secondary">{description}</p>}
      {error && (
        <p role="alert" className="mt-2 text-sm text-error">
          {error}
        </p>
      )}
    </Modal>
  )
}
