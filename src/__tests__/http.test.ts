import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, csrfToken, request, setUnauthorizedHandler } from '../http'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function lastCall() {
  const mock = fetch as unknown as ReturnType<typeof vi.fn>
  return mock.mock.calls.at(-1) as [string, RequestInit]
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: true })))
  document.cookie = 'soriham_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  setUnauthorizedHandler(null)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('헤더 병합', () => {
  it('호출자가 준 헤더가 content-type을 지우지 않는다', async () => {
    // init을 헤더보다 뒤에 펼치면 호출자 헤더가 통째로 덮어쓴다
    await request('/api/x', {
      method: 'POST',
      body: JSON.stringify({ a: 1 }),
      headers: { 'x-extra': '1' },
    })

    const headers = new Headers(lastCall()[1].headers)
    expect(headers.get('content-type')).toBe('application/json')
    expect(headers.get('x-extra')).toBe('1')
  })

  it('호출자가 content-type을 정하면 그대로 둔다', async () => {
    await request('/api/x', {
      method: 'POST',
      body: 'raw',
      headers: { 'content-type': 'text/plain' },
    })

    expect(new Headers(lastCall()[1].headers).get('content-type')).toBe('text/plain')
  })

  it('FormData에는 content-type을 붙이지 않는다', async () => {
    // 경계 문자열은 브라우저가 정한다. 손으로 붙이면 서버가 본문을 못 읽는다
    await request('/api/x', { method: 'POST', body: new FormData() })

    expect(new Headers(lastCall()[1].headers).has('content-type')).toBe(false)
  })
})

describe('CSRF 헤더', () => {
  it('비-GET에는 쿠키에서 읽어 붙인다', async () => {
    document.cookie = 'soriham_csrf=aB3-_x9Qz'

    await request('/api/x', { method: 'DELETE' })

    expect(new Headers(lastCall()[1].headers).get('x-csrf-token')).toBe('aB3-_x9Qz')
  })

  it('GET에는 붙이지 않는다', async () => {
    // 오디오 태그는 헤더를 실을 수 없다. GET 면제가 재생이 도는 보증이다
    document.cookie = 'soriham_csrf=aB3-_x9Qz'

    await request('/api/x')

    expect(new Headers(lastCall()[1].headers).has('x-csrf-token')).toBe(false)
  })

  it('쿠키가 없으면 붙이지 않는다', async () => {
    await request('/api/x', { method: 'POST', body: '{}' })

    expect(new Headers(lastCall()[1].headers).has('x-csrf-token')).toBe(false)
  })

  it('다른 쿠키 사이에서도 찾는다', () => {
    document.cookie = 'other=1'
    document.cookie = 'soriham_csrf=aB3-_x9Qz'
    document.cookie = 'another=2'

    expect(csrfToken()).toBe('aB3-_x9Qz')
  })
})

describe('응답 처리', () => {
  it('204에는 본문을 읽지 않는다', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))

    await expect(request('/api/x', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('오류 본문의 detail을 메시지로 쓴다', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ detail: '한도를 넘었습니다' }, 413))

    await expect(request('/api/x')).rejects.toThrow('한도를 넘었습니다')
  })

  it('객체 detail도 원본을 들고 있다', async () => {
    // 중복 업로드는 detail에 기존 녹음 id를 담아 온다
    const detail = { message: '이미 등록된 파일입니다', recording_id: 'abc' }
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ detail }, 409))

    const error = await request('/api/x').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(409)
    expect((error as ApiError).detail).toEqual(detail)
    expect((error as ApiError).message).toBe('이미 등록된 파일입니다')
  })

  it('본문 없는 오류도 상태 코드로 말한다', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }))

    await expect(request('/api/x')).rejects.toThrow('요청 실패 (500)')
  })
})

describe('세션 만료 처리', () => {
  it('401이면 알린다', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ detail: '로그인이 필요합니다' }, 401))

    await expect(request('/api/x')).rejects.toThrow()

    expect(handler).toHaveBeenCalledOnce()
  })

  it('403이면 알리지 않는다', async () => {
    // 403은 로그인은 됐는데 못 하는 것이다. 로그인 화면으로 보내면 무한 반복이다
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ detail: '관리자 승인 대기 중입니다' }, 403))

    await expect(request('/api/x')).rejects.toThrow()

    expect(handler).not.toHaveBeenCalled()
  })

  it('404도 알리지 않는다', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ detail: '녹음이 없습니다' }, 404))

    await expect(request('/api/x')).rejects.toThrow()

    expect(handler).not.toHaveBeenCalled()
  })
})

describe('요청 구성', () => {
  it('쿠키를 실어 보낸다', async () => {
    await request('/api/x')

    expect(lastCall()[1].credentials).toBe('same-origin')
  })

  it('앞 슬래시가 없는 경로도 받는다', async () => {
    await request('api/x')

    expect(lastCall()[0]).toBe('/api/x')
  })
})
