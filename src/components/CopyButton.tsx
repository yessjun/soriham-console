import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from './Button'

type Props = {
  value: string
  label?: string
}

/**
 * 누르면 아이콘이 잠시 체크로 바뀐다. 토스트를 띄우지 않는다.
 *
 * 클립보드 접근이 막힌 브라우저가 있으므로, 실패하면 그 자리에서 선택 가능한
 * 텍스트를 내놓는다. 조용히 아무 일도 없는 것이 가장 나쁘다.
 */
export function CopyButton({ value, label = '복사' }: Props) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setState('copied')
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setState('idle'), 1500)
    } catch {
      setState('failed')
    }
  }

  if (state === 'failed') {
    return (
      <input
        readOnly
        value={value}
        aria-label={`${label} (직접 선택)`}
        onFocus={(event) => event.currentTarget.select()}
        className="h-8 w-full rounded-[6px] border border-border-strong bg-surface px-2 text-sm text-text"
      />
    )
  }

  return (
    <Button variant="ghost" onClick={copy} aria-label={label}>
      {state === 'copied' ? <Check className="size-4" /> : <Copy className="size-4" />}
      {state === 'copied' ? '복사함' : label}
    </Button>
  )
}
