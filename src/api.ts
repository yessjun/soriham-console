// REST API 클라이언트. 개발은 vite proxy(/api → api 서버), 배포는 동일 오리진 전제.

export interface Tag {
  id: string
  name: string
}

export interface RecordingSummary {
  id: string
  filename: string
  title: string | null
  summary: string | null
  recorded_at: string | null
  duration_sec: number | null
  status: string
  language: string | null
  tags: Tag[]
}

export interface RecordingList {
  items: RecordingSummary[]
  total: number
}

export interface Segment {
  idx: number
  start_sec: number
  end_sec: number
  speaker_key: string | null
  text: string
}

export interface RecordingDetail extends RecordingSummary {
  error: string | null
  stt_meta: Record<string, unknown> | null
  speaker_names: Record<string, string>
  segments: Segment[]
}

export interface SearchHit {
  recording: RecordingSummary
  segment: Segment | null
}

export interface StatusCount {
  status: string
  count: number
  audio_sec: number
}

export interface Stats {
  by_status: StatusCount[]
  done_ratio: number
  speed_ratio: number | null
  eta_sec: number | null
  recent_errors: RecordingSummary[]
}

/** 서버가 돌려준 detail을 사람이 읽을 문자열로 (409는 객체로 온다) */
function detailMessage(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object' && 'message' in detail) {
    const message = (detail as { message: unknown }).message
    if (typeof message === 'string') return message
  }
  return fallback
}

/** 업로드 실패 — 중복이면 기존 녹음 id가 실린다 */
export class UploadError extends Error {
  status: number
  recordingId?: string

  constructor(message: string, status: number, recordingId?: string) {
    super(message)
    this.name = 'UploadError'
    this.status = status
    this.recordingId = recordingId
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(path, {
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
    ...init,
  })
  if (!resp.ok) {
    let detail = `요청 실패 (${resp.status})`
    try {
      const body = await resp.json()
      detail = detailMessage(body.detail, detail)
    } catch {
      // 본문 없는 오류는 상태 코드 메시지 유지
    }
    throw new Error(detail)
  }
  return resp.json() as Promise<T>
}

export const api = {
  listRecordings(params: { q?: string; status?: string; tag?: string; limit?: number; offset?: number } = {}) {
    const qs = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') qs.set(key, String(value))
    }
    const suffix = qs.size ? `?${qs}` : ''
    return request<RecordingList>(`/api/recordings${suffix}`)
  },
  recording(id: string) {
    return request<RecordingDetail>(`/api/recordings/${id}`)
  },
  updateTitle(id: string, title: string) {
    return request<RecordingSummary>(`/api/recordings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    })
  },
  renameSpeaker(id: string, speakerKey: string, name: string) {
    return request<Record<string, string>>(
      `/api/recordings/${id}/speakers/${encodeURIComponent(speakerKey)}`,
      { method: 'PUT', body: JSON.stringify({ name }) },
    )
  },
  addTag(id: string, name: string) {
    return request<Tag[]>(`/api/recordings/${id}/tags`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  },
  removeTag(id: string, tagId: string) {
    return request<Tag[]>(`/api/recordings/${id}/tags/${tagId}`, { method: 'DELETE' })
  },
  tags() {
    return request<Tag[]>('/api/tags')
  },
  search(q: string) {
    return request<{ hits: SearchHit[] }>(`/api/search?${new URLSearchParams({ q })}`)
  },
  stats() {
    return request<Stats>('/api/stats')
  },
  /**
   * 오디오 업로드. fetch는 업로드 진행률을 주지 못해 XHR을 쓴다.
   * 취소하려면 돌려받은 abort()를 호출한다.
   */
  uploadRecording(
    file: File,
    onProgress?: (ratio: number) => void,
  ): { promise: Promise<RecordingSummary>; abort: () => void } {
    const xhr = new XMLHttpRequest()
    const promise = new Promise<RecordingSummary>((resolve, reject) => {
      const form = new FormData()
      form.append('file', file)
      xhr.open('POST', '/api/recordings')
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress?.(e.loaded / e.total)
      })
      xhr.addEventListener('load', () => {
        let body: { detail?: unknown } = {}
        try {
          body = JSON.parse(xhr.responseText)
        } catch {
          // 본문 없는 응답은 상태 코드 메시지로 처리
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(body as unknown as RecordingSummary)
          return
        }
        const recordingId =
          body.detail && typeof body.detail === 'object' && 'recording_id' in body.detail
            ? ((body.detail as { recording_id: unknown }).recording_id ?? undefined)
            : undefined
        reject(
          new UploadError(
            detailMessage(body.detail, `업로드 실패 (${xhr.status})`),
            xhr.status,
            typeof recordingId === 'string' ? recordingId : undefined,
          ),
        )
      })
      xhr.addEventListener('error', () => reject(new UploadError('업로드 중 연결이 끊겼습니다', 0)))
      xhr.addEventListener('abort', () => reject(new UploadError('업로드를 취소했습니다', 0)))
      xhr.send(form)
    })
    return { promise, abort: () => xhr.abort() }
  },
  audioUrl(id: string) {
    return `/api/recordings/${id}/audio`
  },
}
