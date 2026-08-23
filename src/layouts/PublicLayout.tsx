import type { ReactNode } from 'react'

/**
 * 공유 링크로 여는 화면. 앱 껍데기를 쓰지 않는다.
 *
 * 사이드바도 계정 메뉴도 업로드도 없다. 여기 오는 사람은 이 녹음 하나만 본다.
 */
export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-bg">
      <header className="border-b border-border bg-surface px-6 py-4">
        <span className="text-lg font-semibold text-text">소리함</span>
      </header>
      <main className="mx-auto max-w-[720px] px-6 py-8">{children}</main>
    </div>
  )
}
