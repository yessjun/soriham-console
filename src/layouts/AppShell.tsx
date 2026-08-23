import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { ChartColumn, Library, Monitor, Moon, Search, Sun, Tags, UserCheck } from 'lucide-react'
import { Avatar } from '../components/Avatar'
import { Menu } from '../components/Menu'
import { PlayerBar } from '../player'
import { applyTheme, loadTheme, nextTheme, type Theme } from '../theme'
import { useAuth } from '../auth/context'
import { useWorkspace } from '../workspace'

const NAV = [
  { to: '/', label: '라이브러리', icon: Library },
  { to: '/search', label: '검색', icon: Search },
  { to: '/tags', label: '태그', icon: Tags },
  { to: '/dashboard', label: '대시보드', icon: ChartColumn },
]

const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon }
const THEME_LABELS = { system: '시스템 테마', light: '라이트 테마', dark: '다크 테마' }

export function AppShell({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const navigate = useNavigate()
  const { state, logout } = useAuth()
  const me = state.phase === 'known' ? state.me : null
  const { current, workspaces, select } = useWorkspace()

  useEffect(() => applyTheme(theme), [theme])

  // 전역 검색 포커스: `/` 키
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey) return
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (target.isContentEditable) return
      // 모달이 떠 있으면 화면을 갈아치우지 않는다. 다이얼로그가 통째로 사라진다
      if (document.querySelector('dialog[open]')) return
      e.preventDefault()
      navigate('/search')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const ThemeIcon = THEME_ICONS[theme]
  // 관리 화면은 서비스 관리자만 본다. 능력 목록으로 정하고 역할을 다시 계산하지 않는다
  const navItems = [
    ...NAV.map((item) => ({ ...item, badge: 0 })),
    ...(me?.capabilities.includes('admin')
      ? [
          {
            to: '/settings/admin',
            label: '계정 관리',
            icon: UserCheck,
            badge: me.pending_user_count ?? 0,
          },
        ]
      : []),
  ]

  return (
    <div className="flex h-full">
      <aside className="flex w-[220px] shrink-0 flex-col border-r border-border bg-surface">
        <div className="px-4 py-5">
          <h1 className="text-lg font-semibold">소리함</h1>
        </div>
        {workspaces.length > 0 && (
          <div className="px-2 pb-3">
            <Menu
              label={`워크스페이스: ${current?.name ?? ''}`}
              trigger={
                <span className="flex h-8 w-full items-center rounded-[6px] px-3 text-sm text-text-secondary hover:bg-bg">
                  {current?.name ?? ''}
                </span>
              }
              items={workspaces.map((w) => ({ label: w.name, onSelect: () => select(w.id) }))}
            />
          </div>
        )}
        <nav className="flex flex-col gap-1 px-2">
          {navItems.map(({ to, label, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex h-8 items-center gap-2 rounded-[6px] px-3 text-sm transition-colors duration-120 ${
                  isActive
                    ? 'bg-accent-subtle font-medium text-accent'
                    : 'text-text-secondary hover:bg-bg'
                }`
              }
            >
              <Icon size={18} strokeWidth={1.75} />
              <span className="flex-1">{label}</span>
              {badge ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-medium text-accent-text-on">
                  {badge}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1 px-2 pb-4">
          <button
            type="button"
            onClick={() => setTheme(nextTheme(theme))}
            className="flex h-8 w-full items-center gap-2 rounded-[6px] px-3 text-sm text-text-secondary transition-colors duration-120 hover:bg-bg"
          >
            <ThemeIcon size={18} strokeWidth={1.75} />
            {THEME_LABELS[theme]}
          </button>
          {me && (
            <Menu
              label={`계정: ${me.user.name}`}
              trigger={
                <span className="flex h-8 w-full items-center gap-2 rounded-[6px] px-3 text-sm text-text-secondary hover:bg-bg">
                  <Avatar name={me.user.name} email={me.user.email} size={24} />
                  <span className="truncate">{me.user.name}</span>
                </span>
              }
              // 설정 화면은 아직 없다. 못 하는 일은 그리지 않는다
              items={[{ label: '로그아웃', onSelect: () => void logout() }]}
            />
          )}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        <PlayerBar />
      </div>
    </div>
  )
}
