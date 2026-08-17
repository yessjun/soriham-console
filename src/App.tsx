import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import {
  ChartColumn,
  Library,
  Monitor,
  Moon,
  Search,
  Sun,
  Tags,
} from 'lucide-react'
import { applyTheme, loadTheme, nextTheme, type Theme } from './theme'
import LibraryPage from './pages/LibraryPage'
import DetailPage from './pages/DetailPage'
import SearchPage from './pages/SearchPage'
import TagsPage from './pages/TagsPage'
import DashboardPage from './pages/DashboardPage'
import { PlayerProvider, PlayerBar } from './player'

const NAV = [
  { to: '/', label: '라이브러리', icon: Library },
  { to: '/search', label: '검색', icon: Search },
  { to: '/tags', label: '태그', icon: Tags },
  { to: '/dashboard', label: '대시보드', icon: ChartColumn },
]

const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon }
const THEME_LABELS = { system: '시스템 테마', light: '라이트 테마', dark: '다크 테마' }

export default function App() {
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const navigate = useNavigate()

  useEffect(() => applyTheme(theme), [theme])

  // 전역 검색 포커스: `/` 키
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      e.preventDefault()
      navigate('/search')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const ThemeIcon = THEME_ICONS[theme]

  return (
    <PlayerProvider>
      <div className="flex h-full">
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-border bg-surface">
          <div className="px-4 py-5">
            <h1 className="text-lg font-semibold">소리함</h1>
          </div>
          <nav className="flex flex-col gap-1 px-2">
            {NAV.map(({ to, label, icon: Icon }) => (
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
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto px-2 pb-4">
            <button
              type="button"
              onClick={() => setTheme(nextTheme(theme))}
              className="flex h-8 w-full items-center gap-2 rounded-[6px] px-3 text-sm text-text-secondary transition-colors duration-120 hover:bg-bg"
            >
              <ThemeIcon size={18} strokeWidth={1.75} />
              {THEME_LABELS[theme]}
            </button>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="min-h-0 flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<LibraryPage />} />
              <Route path="/recordings/:id" element={<DetailPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/tags" element={<TagsPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
            </Routes>
          </main>
          <PlayerBar />
        </div>
      </div>
    </PlayerProvider>
  )
}
