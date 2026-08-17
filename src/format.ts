export function formatDuration(sec: number | null | undefined): string {
  if (sec == null) return '--:--'
  const total = Math.round(sec)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '날짜 미상'
  const d = new Date(iso)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${mo}-${da} ${hh}:${mi}`
}

export function formatEta(sec: number | null | undefined): string {
  if (sec == null) return '-'
  if (sec < 60) return '1분 미만'
  const totalMin = Math.round(sec / 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`
}

// 용어집 상태머신 이름 그대로 표기하되 화면용 짧은 설명을 병기
export const STATUS_LABELS: Record<string, string> = {
  pending: 'pending',
  transcribing: 'transcribing',
  diarizing: 'diarizing',
  enriching: 'enriching',
  done: 'done',
  error: 'error',
  missing: 'missing',
  duplicate: 'duplicate',
}
