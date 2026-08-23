import { useEffect, useRef, useState, type ReactNode } from 'react'

export type MenuItem = {
  label: string
  onSelect: () => void
  destructive?: boolean
}

type Props = {
  trigger: ReactNode
  items: MenuItem[]
  label: string
}

export function Menu({ trigger, items, label }: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function close() {
    setOpen(false)
    // 닫으면 트리거로 포커스를 돌려준다. 안 돌려주면 키보드 위치가 문서 처음으로 튄다
    triggerRef.current?.focus()
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!open) return
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => (i + 1) % items.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => (i - 1 + items.length) % items.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      items[active]?.onSelect()
      close()
    }
  }

  return (
    <div ref={root} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => {
          setOpen((v) => !v)
          setActive(0)
        }}
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          aria-label={label}
          className="absolute right-0 top-[calc(100%+4px)] z-10 min-w-40 rounded-[10px] border border-border bg-surface-raised py-1 shadow-2"
        >
          {items.map((item, i) => (
            <button
              key={item.label}
              role="menuitem"
              type="button"
              tabIndex={-1}
              onMouseEnter={() => setActive(i)}
              onClick={() => {
                item.onSelect()
                close()
              }}
              className={`flex h-8 w-full items-center px-3 text-left text-sm ${
                item.destructive ? 'text-error' : 'text-text'
              } ${i === active ? 'bg-accent-subtle' : ''}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
