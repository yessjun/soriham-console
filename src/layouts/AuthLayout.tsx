import type { ReactNode } from 'react'

/**
 * 로그인, 가입, 승인 대기, 초대 수락이 쓰는 전면 레이아웃.
 *
 * 세로 중앙 정렬을 쓰지 않는다. 오류 메시지가 늘 때마다 폼이 위아래로 흔들린다.
 */
export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="min-h-full bg-bg px-4 pt-[15vh]">
      <div className="mx-auto w-[320px]">
        <h1 className="text-lg font-semibold text-text">{title}</h1>
        {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
        <div className="mt-6">{children}</div>
        {footer && <div className="mt-6 text-sm text-text-secondary">{footer}</div>}
      </div>
    </div>
  )
}
