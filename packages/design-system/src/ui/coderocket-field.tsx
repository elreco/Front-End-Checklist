import { cn } from '@repo/utils'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

const fieldClasses =
  'mt-2 w-full border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors duration-200 placeholder:text-muted focus:border-signal disabled:cursor-not-allowed disabled:opacity-50'

/** Renders a shared CodeRocket text field. */
export function CodeRocketInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClasses, className)} data-slot="coderocket-input" {...props} />
}

/** Renders a shared CodeRocket multiline field. */
export function CodeRocketTextarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClasses, 'min-h-36 resize-y', className)} {...props} />
}
