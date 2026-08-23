// REST API 클라이언트. 호출 공통 층은 http.ts에 있다.

import { apiUrl, csrfToken, detailMessage, request } from './http'

export { ApiError, apiUrl, setForbiddenHandler, setUnauthorizedHandler } from './http'

export interface UserOut {
  id: string
  email: string
  name: string
}

export interface WorkspaceRef {
  id: string
  name: string
  slug: string
  role: string
  /** 이 워크스페이스에서 할 수 있는 것. 역할로 화면이 다시 계산하지 않는다 */
  capabilities: string[]
}

export interface Me {
  user: UserOut
  /** pending | active | rejected | disabled */
  status: string
  workspaces: WorkspaceRef[]
  default_workspace_id: string | null
  /** 계정 단위 능력. 워크스페이스 안에서 할 수 있는 것은 WorkspaceRef가 가진다 */
  capabilities: string[]
  pending_user_count: number | null
}

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
  /** upload | scan — 삭제 확인 문구가 갈린다 */
  source: string
  size_bytes: number
  status: string
  language: string | null
  tags: Tag[]
  /** 처리 중일 때만 채워진다 (0~1) */
  progress: number | null
  /** 남은 시간 추정(초). 근거가 없으면 null */
  eta_sec: number | null
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
  /** speech | noise — noise는 말이 아닌 구간으로 판정된 자리 */
  kind: string
}

export interface ShareState {
  user_count: number
  link_count: number
}

export interface RecordingDetail extends RecordingSummary {
  can_edit: boolean
  can_manage: boolean
  /** 공유를 관리할 권한이 없으면 비어 있다 */
  share_state: ShareState | null
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

/** 업로드 실패. 중복이면 기존 녹음 id가 실린다 */
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

export const api = {
  me() {
    return request<Me>('/api/auth/me')
  },
  login(email: string, password: string) {
    return request<Me>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },
  signup(body: { email: string; password: string; display_name: string; signup_note?: string }) {
    return request<Me>('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) })
  },
  logout() {
    return request<void>('/api/auth/logout', { method: 'POST' })
  },
  listRecordings(
    workspaceId: string,
    params: { q?: string; status?: string; tag?: string; limit?: number; offset?: number } = {},
  ) {
    const qs = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') qs.set(key, String(value))
    }
    const suffix = qs.size ? `?${qs}` : ''
    return request<RecordingList>(`/api/workspaces/${workspaceId}/recordings${suffix}`)
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
  tags(workspaceId: string) {
    return request<Tag[]>(`/api/workspaces/${workspaceId}/tags`)
  },
  search(workspaceId: string, q: string) {
    const qs = new URLSearchParams({ q })
    return request<{ hits: SearchHit[] }>(`/api/workspaces/${workspaceId}/search?${qs}`)
  },
  stats(workspaceId: string) {
    return request<Stats>(`/api/workspaces/${workspaceId}/stats`)
  },
  /**
   * 오디오 업로드. fetch는 업로드 진행률을 주지 못해 XHR을 쓴다.
   * 취소하려면 돌려받은 abort()를 호출한다.
   */
  uploadRecording(
    workspaceId: string,
    file: File,
    onProgress?: (ratio: number) => void,
  ): { promise: Promise<RecordingSummary>; abort: () => void } {
    const xhr = new XMLHttpRequest()
    const promise = new Promise<RecordingSummary>((resolve, reject) => {
      const form = new FormData()
      form.append('file', file)
      xhr.open('POST', apiUrl(`/api/workspaces/${workspaceId}/recordings`))
      xhr.withCredentials = true
      // XHR은 공통 층을 지나지 않으므로 CSRF 헤더를 여기서 붙인다
      const token = csrfToken()
      if (token) xhr.setRequestHeader('x-csrf-token', token)
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
    return apiUrl(`/api/recordings/${id}/audio`)
  },
}
