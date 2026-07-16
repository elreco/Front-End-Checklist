import { Braces } from '@repo/design-system/icons'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { DOCUMENTATION_RULES, DOCUMENTATION_RULESET_VERSION } from '@/lib/docs'
import { DocsNavigation } from './docs-navigation'

/** Shared public shell for the official CodeRocket documentation. */
export function DocsShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto grid min-h-[78vh] max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:py-12">
      <aside>
        <div className="border border-border bg-surface lg:sticky lg:top-24">
          <div className="border-border border-b p-4">
            <p className="font-mono text-signal text-xs uppercase tracking-[.16em]">
              Official docs
            </p>
            <p className="mt-2 text-muted text-sm">Product and rules reference</p>
          </div>
          <DocsNavigation />
          <div className="border-border border-t p-4 text-xs">
            <p className="flex items-center gap-2 font-mono text-foreground">
              <Braces aria-hidden className="h-3.5 w-3.5 text-signal" />
              {DOCUMENTATION_RULES.length} synced rules
            </p>
            <p className="mt-2 truncate font-mono text-muted" title={DOCUMENTATION_RULESET_VERSION}>
              {DOCUMENTATION_RULESET_VERSION}
            </p>
          </div>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </main>
  )
}

/** Consistent title block for documentation pages. */
export function DocsHeader({
  description,
  eyebrow,
  title
}: {
  description: string
  eyebrow: string
  title: string
}) {
  return (
    <header className="border-border border-b pb-8">
      <p className="font-mono text-accent text-xs uppercase tracking-[.18em]">{eyebrow}</p>
      <h1 className="mt-4 max-w-4xl font-editorial text-5xl leading-[.96] tracking-[-.035em] sm:text-7xl">
        {title}
      </h1>
      <p className="mt-6 max-w-3xl text-lg text-muted leading-8">{description}</p>
    </header>
  )
}

/** Accessible documentation breadcrumb trail. */
export function DocsBreadcrumbs({ items }: { items: Array<{ href?: string; label: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 font-mono text-muted text-xs">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li className="flex items-center gap-2" key={item.label}>
            {index > 0 ? <span aria-hidden>/</span> : null}
            {item.href ? (
              <Link className="hover:text-foreground" href={item.href}>
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-foreground">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

/** Render a shared terminal-style documentation code block. */
export function DocsCodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto border border-border bg-[#0B1020] p-5 font-mono text-[#dce7ff] text-sm leading-7">
      <code>{children}</code>
    </pre>
  )
}
