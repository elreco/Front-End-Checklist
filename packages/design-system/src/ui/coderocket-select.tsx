'use client'

import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from '@repo/design-system/icons'
import { cn } from '@repo/utils'

export interface CodeRocketSelectOption {
  label: string
  value: string
}

/** Render a themeable, keyboard-accessible select whose menu stays inside the design system. */
export function CodeRocketSelect({
  className,
  disabled,
  id,
  name,
  onValueChange,
  options,
  value
}: {
  className?: string
  disabled?: boolean
  id: string
  name?: string
  onValueChange: (value: string) => void
  options: ReadonlyArray<CodeRocketSelectOption>
  value: string
}) {
  return (
    <SelectPrimitive.Root
      disabled={disabled}
      name={name}
      onValueChange={onValueChange}
      value={value}
    >
      <SelectPrimitive.Trigger
        className={cn(
          'flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 border border-border bg-background px-4 py-2.5 text-left text-foreground outline-none transition-colors',
          'focus:border-signal disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted',
          className
        )}
        data-slot="coderocket-select"
        id={id}
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon asChild>
          <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-muted" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          align="start"
          className="z-50 overflow-hidden border border-border bg-background shadow-lg"
          position="popper"
          sideOffset={4}
          style={{
            maxHeight: 'min(22rem, var(--radix-select-content-available-height))',
            minWidth: 'var(--radix-select-trigger-width)'
          }}
        >
          <SelectPrimitive.ScrollUpButton className="flex h-8 items-center justify-center border-border border-b bg-surface text-muted">
            <ChevronUp aria-hidden className="h-4 w-4" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-1">
            {options.map(option => (
              <SelectPrimitive.Item
                className="flex min-h-10 cursor-pointer select-none items-center gap-3 px-3 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-surface-raised data-[state=checked]:text-signal"
                key={option.value}
                value={option.value}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check aria-hidden className="h-4 w-4" />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex h-8 items-center justify-center border-border border-t bg-surface text-muted">
            <ChevronDown aria-hidden className="h-4 w-4" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
