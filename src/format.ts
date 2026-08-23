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


/**
 * 받침에 따라 갈리는 조사를 붙인다.
 *
 * `${name}가 공유`처럼 한쪽으로 박아두면 "김민준가 공유"가 된다. 한글이 아닌 글자로
 * 끝나면(영문 이름, 이메일) 받침 없는 쪽을 쓴다.
 */
export function withJosa(word: string, withBatchim: string, withoutBatchim: string): string {
  const last = word.trim().slice(-1)
  const code = last.charCodeAt(0)
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return `${word}${withoutBatchim}`
  return `${word}${(code - 0xac00) % 28 === 0 ? withoutBatchim : withBatchim}`
}
