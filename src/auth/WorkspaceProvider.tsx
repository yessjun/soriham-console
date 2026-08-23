import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { WorkspaceContext } from '../workspace'
import { useAuth } from './context'

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { state } = useAuth()
  const me = state.phase === 'known' ? state.me : null
  const [selected, setSelected] = useState<string | null>(null)

  // 계정이 바뀌면 고른 값을 버린다. 안 버리면 다른 계정의 워크스페이스 id가 남는다
  useEffect(() => {
    setSelected(null)
  }, [me?.user.id])

  const workspaces = useMemo(() => me?.workspaces ?? [], [me])
  const current = useMemo(() => {
    if (selected) {
      const found = workspaces.find((w) => w.id === selected)
      if (found) return found
    }
    return workspaces.find((w) => w.id === me?.default_workspace_id) ?? workspaces[0] ?? null
  }, [selected, workspaces, me?.default_workspace_id])

  const select = useCallback((id: string) => setSelected(id), [])
  const value = useMemo(() => ({ current, workspaces, select }), [current, workspaces, select])

  return <WorkspaceContext value={value}>{children}</WorkspaceContext>
}
