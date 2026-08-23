// 배경은 표시 이름에서 유도한다. 사진은 올릴 자리가 없으므로 두지 않는다.
// 색은 토큰에서 섞어 만든다 — 프레임워크 기본 팔레트를 쓰면 테마가 바뀌어도 그대로 남고,
// 밝은 회색 위 흰 글자는 사실상 읽히지 않는다
const STEPS = [18, 26, 34, 42]

function toneOf(seed: string): string {
  let sum = 0
  for (const ch of seed) sum += ch.codePointAt(0) ?? 0
  return `color-mix(in srgb, var(--text-secondary) ${STEPS[sum % STEPS.length]}%, var(--surface))`
}

type Props = {
  name: string
  email?: string
  size?: 24 | 32
}

export function Avatar({ name, email, size = 24 }: Props) {
  const source = name.trim() || email?.trim() || '?'
  const initial = [...source][0] ?? '?'
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full text-xs font-semibold text-text"
      style={{ width: size, height: size, background: toneOf(source) }}
      data-initial={initial}
    >
      {initial}
    </span>
  )
}
