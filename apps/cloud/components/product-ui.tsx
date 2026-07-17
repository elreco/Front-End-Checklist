import type { GateStatus } from '@coderocket/core'
import { BarChart3 } from '@repo/design-system/icons'
import type { ReactNode } from 'react'
import { getGateLanguage } from '@/lib/product-language'

/** Show the user-facing result of a completed website check. */
export function GateBadge({ status }: { status: GateStatus }) {
  const language = getGateLanguage(status)
  const className =
    status === 'passed'
      ? 'border-success bg-success/10 text-success'
      : status === 'failed'
        ? 'border-danger bg-danger/10 text-danger'
        : status === 'inconclusive'
          ? 'border-warning bg-warning/10 text-warning'
          : 'border-accent bg-accent/10 text-accent'
  return (
    <span
      className={`inline-flex border px-2.5 py-1 font-mono font-semibold text-[10px] uppercase tracking-[.08em] ${className}`}
    >
      {language.label}
    </span>
  )
}

/** Present a consistent empty product state with optional next actions. */
export function EmptyState({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="border border-border border-dashed bg-surface px-6 py-14 text-center">
      <BarChart3 aria-hidden className="mx-auto h-7 w-7 text-signal" />
      <h2 className="mt-4 font-heading font-semibold text-xl">{title}</h2>
      <div className="mx-auto mt-2 max-w-md text-muted leading-7">{children}</div>
    </div>
  )
}
