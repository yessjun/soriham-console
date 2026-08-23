import { createContext, useContext } from 'react'
import type { WorkspaceRef } from './api'

// 지금 보고 있는 워크스페이스. 컬렉션 호출은 전부 이 값을 경로에 싣는다.
//
// 모듈 변수로 두면 전환해도 화면이 다시 그려지지 않는다. 라우트가 바뀌는 경우에만
// 우연히 갱신되고, 정작 주 화면인 라이브러리에서 전환하면 이전 워크스페이스의 목록이
// 새 이름표를 단 채 남는다.

export type WorkspaceValue = {
  current: WorkspaceRef | null
  workspaces: WorkspaceRef[]
  select: (id: string) => void
}

export const WorkspaceContext = createContext<WorkspaceValue | null>(null)

export function useWorkspace(): WorkspaceValue {
  const value = useContext(WorkspaceContext)
  if (!value) throw new Error('WorkspaceProvider 밖에서 useWorkspace를 불렀다')
  return value
}

/** 컬렉션 호출에 실을 id. 아직 정해지지 않았으면 빈 문자열 */
export function useWorkspaceId(): string {
  return useWorkspace().current?.id ?? ''
}

/** 이 워크스페이스에서 할 수 있는 일인지. 역할 문자열로 화면이 다시 계산하지 않는다 */
export function useCan(capability: string): boolean {
  return useWorkspace().current?.capabilities.includes(capability) ?? false
}
