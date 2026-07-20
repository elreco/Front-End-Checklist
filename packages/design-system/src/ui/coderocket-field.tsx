import { cn } from '@repo/utils'
import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes
} from 'react'

const fieldBaseClasses =
  'mt-2 w-full border border-border bg-background text-foreground outline-none transition-colors duration-200 placeholder:text-muted focus:border-signal disabled:cursor-not-allowed disabled:opacity-50'

/** Shared text-input props, including optional non-interactive leading content. */
export interface CodeRocketInputProps extends InputHTMLAttributes<HTMLInputElement> {
  leadingContent?: ReactNode
}

/** Renders a shared CodeRocket text field. */
export function CodeRocketInput({ className, leadingContent, ...props }: CodeRocketInputProps) {
  const input = (
    <input
      className={cn(
        fieldBaseClasses,
        'h-12 px-4 py-0',
        leadingContent ? 'peer mt-0 pl-9' : '',
        className
      )}
      data-slot="coderocket-input"
      {...props}
    />
  )
  if (!leadingContent) return input
  return (
    <span className="relative mt-2 block" data-slot="coderocket-input-container">
      {input}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted peer-disabled:opacity-50"
      >
        {leadingContent}
      </span>
    </span>
  )
}

/** Renders a shared CodeRocket multiline field. */
export const CodeRocketTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function CodeRocketTextarea({ className, ...props }, ref) {
  return (
    <textarea
      className={cn(fieldBaseClasses, 'min-h-36 resize-y px-4 py-3', className)}
      ref={ref}
      {...props}
    />
  )
})
