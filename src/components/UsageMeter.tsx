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

  // 한도마다 푸는 방법이 다르다. 전사 시간은 녹음을 지워도 줄지 않는다 —
  // 사용 이력은 삭제를 살아남고, 30일 창에서 빠져나가야 풀린다
  const lines: string[] = []
  if (usage.quota_minutes && usage.used_minutes / usage.quota_minutes >= 0.8) {
    lines.push(
      `전사 시간 ${Math.round(usage.used_minutes)}분 / ${usage.quota_minutes}분 사용 중입니다.` +
        ` 최근 ${usage.window_days}일을 세므로 시간이 지나면 풀립니다.`,
    )
  }
  if (usage.quota_bytes && usage.used_bytes / usage.quota_bytes >= 0.8) {
    lines.push(
      `저장 공간 ${gb(usage.used_bytes)} / ${gb(usage.quota_bytes)} 사용 중입니다.` +
        ' 필요 없는 녹음을 지우면 돌아옵니다.',
    )
  }
  if (lines.length === 0) return null

  return (
    <div className="mb-3 rounded-[6px] bg-warn/10 px-3 py-2 text-sm text-warn">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  )
}
