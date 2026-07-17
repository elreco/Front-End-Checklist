'use client'

import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@repo/utils'
import * as React from 'react'

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      data-slot="tooltip-content"
      sideOffset={sideOffset}
      className={cn(
        'z-50 max-w-64 overflow-hidden border border-border bg-surface-raised px-2.5 py-1.5',
        'font-medium font-mono text-foreground text-xs shadow-lg',
        'fade-in-0 zoom-in-95 animate-in',
        'data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:animate-out',
        'data-[side=bottom]:slide-in-from-top-2',
        'data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2',
        'data-[side=top]:slide-in-from-bottom-2',
        'motion-reduce:animate-none',
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

interface TooltipHintProps {
  children: React.ReactElement
  className?: string
  content: React.ReactNode
  enabled?: boolean
  side?: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>['side']
  sideOffset?: number
}

/** Adds a shared accessible tooltip to one interactive trigger when enabled. */
function TooltipHint({
  children,
  className,
  content,
  enabled = true,
  side = 'top',
  sideOffset = 8
}: TooltipHintProps) {
  if (!enabled) return children

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className={className} side={side} sideOffset={sideOffset}>
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

export type { TooltipHintProps }
export { Tooltip, TooltipContent, TooltipHint, TooltipProvider, TooltipTrigger }
