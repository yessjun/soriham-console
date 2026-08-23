import type { ReactNode } from 'react'

/**
 * 공유 링크로 여는 화면. 앱 껍데기를 쓰지 않는다.
 *
 * 사이드바도 계정 메뉴도 업로드도 없다. 여기 오는 사람은 이 녹음 하나만 본다.
 */
export function PublicLayout({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    // 플레이어 바는 화면 하단에 고정한다. 본문 끝에 두면 긴 녹취록에서 스크롤을 따라
    // 사라져 재생 중에 조작할 수 없다
    <div className="flex h-full flex-col bg-bg">
      <header className="border-b border-border bg-surface px-6 py-4">
        <span className="text-lg font-semibold text-text">소리함</span>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] px-6 py-8">{children}</div>
      </main>
      {footer}
    </div>
  )
}
