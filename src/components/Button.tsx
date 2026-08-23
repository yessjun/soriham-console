import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-accent-text-on hover:bg-accent-hover',
  secondary: 'border border-border-strong bg-surface text-text hover:bg-bg',
  ghost: 'text-text-secondary hover:bg-accent-subtle',
  destructive: 'bg-error text-error-text-on hover:opacity-90',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  // 처리 중에는 스피너를 넣고 비활성으로 둔다. 두 번 눌리는 것을 막는다
  busy?: boolean
  // 확인 다이얼로그가 취소 버튼에 기본 포커스를 줄 때 쓴다
  ref?: Ref<HTMLButtonElement>
  children: ReactNode
}

export function Button({
  variant = 'secondary',
  busy = false,
  disabled,
  className = '',
  children,
  ...rest
}: Props) {
  const height = variant === 'primary' ? 'h-9 px-3.5' : 'h-8 px-3'
  return (
    <button
      type="button"
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex items-center justify-center gap-1.5 rounded-[6px] text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${height} ${VARIANT[variant]} ${className}`}
      {...rest}
    >
      {busy && <Spinner />}
      {children}
    </button>
  )
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
    />
  )
}
