'use client'

import { ChevronDown } from '@repo/design-system/icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@repo/design-system/ui/dropdown-menu'
import type { ReactNode } from 'react'

/** Anchor one compact contextual menu to the studio toolbar with dismiss-on-outside-click. */
export function ToolbarMenu({
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
  return (
    <DropdownMenu defaultOpen={open} modal={false}>
      <DropdownMenuTrigger className="group flex h-8 cursor-pointer items-center gap-1.5 border border-transparent px-2 text-muted text-xs outline-none transition-colors hover:border-border hover:bg-surface-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2 data-[state=open]:border-border data-[state=open]:bg-surface-raised data-[state=open]:text-foreground">
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
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align === 'right' ? 'end' : 'start'}
        className="max-h-[calc(100dvh-4rem)] overflow-y-auto rounded-none bg-surface p-0"
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
