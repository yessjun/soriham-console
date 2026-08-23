// 녹음 상태 한 곳. api의 RECORDING_STATUSES와 순서까지 맞춘다.
// 여기 빠진 상태는 색도 필터도 없이 화면에서 조용히 사라지므로 목록을 흩어 두지 않는다.

export const STATUSES = [
  'pending',
  'transcribing',
  'diarizing',
  'enriching',
  'summarizing',
  'done',
  'error',
  'missing',
  'duplicate',
  'quota_blocked',
] as const

/** 워커가 붙어 있거나 곧 붙는 상태. 화면을 주기로 다시 받는 기준 */
export const ACTIVE_STATUSES: readonly string[] = [
  'pending',
  'transcribing',
  'diarizing',
  'enriching',
  'summarizing',
]

export const STATUS_COLOR: Record<string, string> = {
  pending: 'var(--warn)',
  transcribing: 'var(--info)',
  diarizing: 'var(--info)',
  enriching: 'var(--info)',
  summarizing: 'var(--info)',
  done: 'var(--ok)',
  error: 'var(--error)',
  missing: 'var(--warn)',
  duplicate: 'var(--text-tertiary)',
  quota_blocked: 'var(--warn)',
}

// 상태 이름은 용어집 표기 그대로 두되, 고장으로 읽히면 곤란한 것만 한국어로 바꾼다
export const STATUS_LABEL: Record<string, string> = {
  quota_blocked: '한도 초과',
}

export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status
}
