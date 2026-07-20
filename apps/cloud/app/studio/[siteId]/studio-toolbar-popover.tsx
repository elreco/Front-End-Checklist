'use client'

import { ChevronDown } from '@repo/design-system/icons'
import { type ReactNode, useEffect, useRef, useState } from 'react'

/**
 * Dismiss-on-outside-click popover for arbitrary interactive toolbar content such as forms.
 * Unlike a menu it imposes no roving focus or typeahead, so inputs inside behave normally.
 */
export function ToolbarPopover({
  align = 'left',
  badge,
  children,
  icon,
  label,
  open = false
}: {
  align?: 'left' | 'right'
  badge?: number
  children: ReactNode
  icon: ReactNode
  label: string
  open?: boolean
}) {
  const [isOpen, setIsOpen] = useState(open)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="group flex h-8 cursor-pointer items-center gap-1.5 border border-transparent px-2 text-muted text-xs outline-none transition-colors hover:border-border hover:bg-surface-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2 data-[state=open]:border-border data-[state=open]:bg-surface-raised data-[state=open]:text-foreground"
        data-state={isOpen ? 'open' : 'closed'}
        onClick={() => setIsOpen(current => !current)}
        type="button"
      >
        {icon}
        <span className="hidden max-w-36 truncate sm:inline">{label}</span>
        {badge ? (
          <span className="min-w-4 bg-warning px-1 text-center font-mono text-[9px] text-warning-foreground">
            {badge}
          </span>
        ) : null}
        <ChevronDown
          aria-hidden
          className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
        />
      </button>
      {isOpen ? (
        <div
          className={`absolute top-[calc(100%+0.35rem)] z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border border-border bg-surface shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}
