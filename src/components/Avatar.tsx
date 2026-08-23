// 배경은 표시 이름에서 유도한다. 사진은 올릴 자리가 없으므로 두지 않는다
const TONES = ['bg-neutral-300', 'bg-neutral-400', 'bg-neutral-500', 'bg-neutral-600']

function toneOf(seed: string): string {
  let sum = 0
  for (const ch of seed) sum += ch.codePointAt(0) ?? 0
  return TONES[sum % TONES.length]
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
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${toneOf(source)}`}
      style={{ width: size, height: size }}
      data-initial={initial}
    >
      {initial}
    </span>
  )
}
