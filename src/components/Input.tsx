import { useRef, type InputHTMLAttributes, type KeyboardEvent } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'onKeyDown'> & {
  label?: string
  error?: string
  /** 바깥 상자에 붙일 클래스. 줄 안에서 늘어나는 것 같은 배치는 여기로 준다 */
  wrapperClassName?: string
  // Enter로 확정하는 입력. 한글 조합 중의 Enter는 조합을 끝내는 키라서 무시해야 한다
  onEnter?: () => void
}

export function Input({
  label,
  error,
  onEnter,
  className = '',
  wrapperClassName = '',
  id,
  ...rest
}: Props) {
  const composing = useRef(false)
  const inputId = id ?? rest.name
  const errorId = error && inputId ? `${inputId}-error` : undefined

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || composing.current) return
    // 조합 중 Enter는 브라우저마다 keyCode 229로 오기도 한다. 두 신호를 모두 본다
    if (event.nativeEvent.isComposing) return
    onEnter?.()
  }

  return (
    // 배치 클래스는 이 상자가 받는다. 안쪽 input에 붙이면 세로 방향 flex 자식이 되어
    // 높이가 눌린다 — flex-1을 넘겼더니 36이어야 할 입력이 18로 찌그러졌다
    <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
      {label && (
        <label htmlFor={inputId} className="text-sm text-text-secondary">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        onCompositionStart={() => (composing.current = true)}
        onCompositionEnd={() => (composing.current = false)}
        onKeyDown={onEnter ? handleKeyDown : undefined}
        className={`h-9 w-full rounded-[6px] border border-border-strong bg-surface px-3 text-sm text-text outline-none placeholder:text-text-tertiary focus:ring-2 focus:ring-accent ${className}`}
        {...rest}
      />
      {error && (
        <p id={errorId} className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  )
}
