import { api } from '../api'
import { useAsync } from '../hooks'
import { useWorkspaceId } from '../workspace'

function gb(bytes: number): string {
  const value = bytes / 1024 ** 3
  return value >= 1 ? `${value.toFixed(1)}GB` : `${Math.round(bytes / 1024 ** 2)}MB`
}

/**
 * 라이브러리 헤더의 한 줄.
 *
 * 80%를 넘겼을 때만 나온다. 늘 띄우면 아무도 안 읽고, 정작 찼을 때도 안 읽는다.
 */
export function UsageWarning() {
  const workspaceId = useWorkspaceId()
  const query = useAsync(
    () => (workspaceId ? api.usage(workspaceId) : Promise.resolve(null)),
    [workspaceId],
  )
  const usage = query.data
  if (!usage) return null

  const parts: string[] = []
  if (usage.quota_minutes) {
    const ratio = usage.used_minutes / usage.quota_minutes
    if (ratio >= 0.8) {
      parts.push(
        `전사 시간 ${Math.round(usage.used_minutes)}분 / ${usage.quota_minutes}분 (${usage.window_days}일)`,
      )
    }
  }
  if (usage.quota_bytes) {
    if (usage.used_bytes / usage.quota_bytes >= 0.8) {
      parts.push(`저장 공간 ${gb(usage.used_bytes)} / ${gb(usage.quota_bytes)}`)
    }
  }
  if (parts.length === 0) return null

  return (
    <p className="mb-3 rounded-[6px] bg-warn/10 px-3 py-2 text-sm text-warn">
      {parts.join(', ')} 사용 중입니다. 필요 없는 녹음을 지우면 공간이 돌아옵니다.
    </p>
  )
}
