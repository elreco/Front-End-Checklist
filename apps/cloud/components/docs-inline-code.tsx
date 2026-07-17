import type { ComponentPropsWithoutRef } from 'react'

/** Renders compact inline code consistently across authored and synchronized documentation. */
export function DocsInlineCode({ className, ...props }: ComponentPropsWithoutRef<'code'>) {
  return (
    <code
      className={`bg-surface-raised px-1.5 py-0.5 font-mono text-[.9em] text-foreground ${className ?? ''}`}
      {...props}
    />
  )
}
