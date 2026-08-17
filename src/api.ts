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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(path, {
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
    ...init,
  })
  if (!resp.ok) {
    let detail = `요청 실패 (${resp.status})`
    try {
      const body = await resp.json()
      if (typeof body.detail === 'string') detail = body.detail
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
  audioUrl(id: string) {
    return `/api/recordings/${id}/audio`
  },
}
