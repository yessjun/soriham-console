// REST 호출의 공통 층. 개발은 vite 프록시(/api → api 서버), 배포는 동일 오리진 전제.

/** 경로 앞에 붙는 자리. 배포 형태가 바뀌면 여기만 고친다 */
export function apiUrl(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}

export class ApiError extends Error {
  readonly status: number
  /** 서버가 준 detail 원본. 409처럼 객체로 오는 경우가 있다 */
  readonly detail: unknown

  constructor(message: string, status: number, detail?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

/** 서버가 돌려준 detail을 사람이 읽을 문자열로 */
export function detailMessage(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object' && 'message' in detail) {
    const message = (detail as { message: unknown }).message
    if (typeof message === 'string') return message
  }
  return fallback
}

type StatusHandler = () => void
let onUnauthorized: StatusHandler | null = null
let onForbidden: StatusHandler | null = null

/**
 * 세션이 끊겼을 때 부를 곳. 401에서만 부른다.
 *
 * 403은 "로그인은 됐는데 이건 못 한다"라서 로그인 화면으로 보내면 무한 반복이 된다.
 * 승인 대기 계정이 워크스페이스를 열 때가 정확히 그 경우다.
 */
export function setUnauthorizedHandler(handler: StatusHandler | null): void {
  onUnauthorized = handler
}

/**
 * 403을 받았을 때 부를 곳. 로그인 화면으로 보내라는 뜻이 아니다.
 *
 * 승인 대기 계정은 로그인에 성공해 세션을 들고 있고, 워크스페이스 호출에서만 403을
 * 받는다. 화면이 든 상태는 그 사이에 승인됐을 수도 있으므로 여기서 다시 물어야
 * 대기 화면과 본화면 중 맞는 쪽으로 넘어간다.
 */
export function setForbiddenHandler(handler: StatusHandler | null): void {
  onForbidden = handler
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** 자바스크립트가 읽어 헤더로 되돌려 보내는 값. 세션 쿠키 자체는 읽을 수 없다 */
export function csrfToken(): string | null {
  const match = document.cookie.split('; ').find((c) => c.startsWith('soriham_csrf='))
  return match ? decodeURIComponent(match.slice('soriham_csrf='.length)) : null
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  // 헤더는 init을 펼친 뒤에 합친다. 앞에 두면 호출자가 넘긴 headers가 통째로 덮어써
  // content-type과 CSRF 헤더가 사라진다
  const headers = new Headers(init.headers)
  if (init.body !== undefined && !(init.body instanceof FormData)) {
    if (!headers.has('content-type')) headers.set('content-type', 'application/json')
  }
  if (!SAFE_METHODS.has(method)) {
    const token = csrfToken()
    if (token) headers.set('x-csrf-token', token)
  }

  const resp = await fetch(apiUrl(path), {
    ...init,
    method,
    // 동일 오리진 배포가 전제라 기본값으로도 쿠키가 실리지만, 전제를 코드에 적어 둔다
    credentials: 'same-origin',
    headers,
  })

  if (!resp.ok) {
    let detail: unknown
    let message = `요청 실패 (${resp.status})`
    try {
      const body = await resp.json()
      detail = body?.detail
      message = detailMessage(detail, message)
    } catch {
      // 본문 없는 오류는 상태 코드 메시지 유지
    }
    // 비밀번호가 걸린 링크는 잠금 해제 전에 401을 준다. 그것을 세션 만료로 다루면
    // 로그인한 사람이 남의 링크를 여는 것만으로 앱이 익명 상태로 뒤집힌다
    if (resp.status === 401 && !path.startsWith('/api/shared/')) onUnauthorized?.()
    if (resp.status === 403) onForbidden?.()
    throw new ApiError(message, resp.status, detail)
  }

  // 204와 205에는 본문이 없다. json()을 부르면 그 자리에서 터진다
  if (resp.status === 204 || resp.status === 205) return undefined as T
  return (await resp.json()) as T
}
