import type { ReactNode } from 'react'
import { SUPPORT_EMAIL } from '@/lib/seo'

interface LegalPageProps {
  children: ReactNode
  description: string
  title: string
}

/** Shared readable layout for CodeRocket legal information. */
export function LegalPage({ children, description, title }: LegalPageProps) {
  return (
    <main className="px-5 py-16 sm:py-20">
      <article className="mx-auto max-w-4xl">
        <header className="border-border border-b pb-10">
          <p className="font-mono text-signal text-xs uppercase tracking-[.18em]">
            CodeRocket legal
          </p>
          <h1 className="mt-5 font-editorial text-5xl tracking-[-.035em] sm:text-7xl">{title}</h1>
          <p className="mt-6 max-w-3xl text-lg text-muted leading-8">{description}</p>
          <p className="mt-5 font-mono text-muted text-xs">Last updated: July 17, 2026</p>
        </header>
        <div className="prose mt-10 max-w-none">{children}</div>
        <footer className="mt-12 border border-border bg-surface p-6">
          <h2 className="font-heading font-semibold text-xl">Questions about this page?</h2>
          <p className="mt-2 text-muted leading-7">
            Contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
        </footer>
      </article>
    </main>
  )
}
