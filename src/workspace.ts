// 지금 보고 있는 워크스페이스. 컬렉션 호출은 전부 이 값을 경로에 싣는다.
//
// 인증 셸이 붙기 전까지의 이음매다. 로그인 응답이 오면 setWorkspaceId로 채워지고,
// 그 전에는 비어 있어 호출이 실패한다 — 옛 엔드포인트를 부르던 때와 같은 상태다.

let current = ''

export function currentWorkspaceId(): string {
  return current
}

export function setWorkspaceId(id: string): void {
  current = id
}
