// 다크 모드: 시스템 기본 + 수동 토글(data-theme, localStorage 유지)

export type Theme = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'soriham-theme'

export function loadTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}

export function applyTheme(theme: Theme) {
  if (theme === 'system') {
    delete document.documentElement.dataset.theme
    localStorage.removeItem(STORAGE_KEY)
  } else {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(STORAGE_KEY, theme)
  }
}

export function nextTheme(current: Theme): Theme {
  const order: Theme[] = ['system', 'light', 'dark']
  return order[(order.indexOf(current) + 1) % order.length]
}
