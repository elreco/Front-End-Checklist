import {
  Archive,
  ArrowRight,
  CheckCircle2,
  Code2,
  FileSearch2,
  ShieldAlert
} from '@repo/design-system/icons'
import type { Metadata } from 'next'
import Link from 'next/link'
import { DocsBreadcrumbs } from '@/components/docs-shell'
import { JsonLd } from '@/components/json-ld'
import { absoluteUrl, createPublicMetadata, SITE_URL } from '@/lib/seo'

const ARCHIVE_PATH = '/components/7igf4HoGRDc'
const ARCHIVE_TITLE = 'Reds Exploit Corner — Homepage Clone — Tailwind AI Component | CodeRocket'

export const metadata: Metadata = createPublicMetadata({
  title: ARCHIVE_TITLE,
  absoluteTitle: true,
  description:
    'Archived CodeRocket record for the Reds Exploit Corner homepage clone, a legacy React and Tailwind AI component.',
  path: ARCHIVE_PATH,
  type: 'article',
  keywords: [
    'Reds Exploit Corner homepage clone',
    'Tailwind AI component',
    'React Tailwind component',
    'AI generated Tailwind CSS'
  ]
})

const archiveUrl = absoluteUrl(ARCHIVE_PATH)
const archiveStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'TechArticle',
      '@id': `${archiveUrl}#archive`,
      headline: ARCHIVE_TITLE,
      description:
        'A preserved metadata and quality-review record for a component created with the former CodeRocket Tailwind AI builder.',
      url: archiveUrl,
      mainEntityOfPage: archiveUrl,
      inLanguage: 'en',
      author: { '@id': `${SITE_URL}/#organization` },
      publisher: { '@id': `${SITE_URL}/#organization` },
      about: ['Tailwind CSS', 'React', 'AI-generated component'],
      isPartOf: { '@id': `${SITE_URL}/#website` }
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Reds Exploit Corner homepage clone',
          item: archiveUrl
        }
      ]
    }
  ]
}

const archiveFacts = [
  ['Record', '7igf4HoGRDc'],
  ['Original category', 'Homepage clone'],
  ['Recorded stack', 'React'],
  ['Styling context', 'Tailwind AI component']
]

/** Preserve one historically valuable component URL without recreating unavailable output. */
export default function RedsExploitCornerArchivePage() {
  return (
    <main className="px-5 py-12 sm:py-20">
      <JsonLd data={archiveStructuredData} />
      <article className="mx-auto max-w-6xl">
        <DocsBreadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Reds Exploit Corner' }]} />

        <header className="border-border border-b pb-12">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 border border-accent px-3 py-1.5 font-mono text-accent text-xs uppercase tracking-[.12em]">
              <Archive aria-hidden className="h-3.5 w-3.5" />
              Legacy record
            </span>
            <span className="font-mono text-muted text-xs">component · 7igf4HoGRDc</span>
          </div>
          <h1 className="mt-6 max-w-5xl font-editorial text-5xl leading-[.94] tracking-[-.035em] sm:text-7xl">
            Reds Exploit Corner
            <br />
            <em>homepage clone.</em>
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted leading-8">
            This page preserves the public record of a React component created with the former
            CodeRocket Tailwind AI builder. The original runnable preview and generated source were
            not retained, so this archive documents the record without fabricating either one.
          </p>
        </header>

        <section className="grid gap-px border border-border bg-border lg:grid-cols-[1.25fr_.75fr]">
          <div className="relative min-h-80 overflow-hidden bg-[#120b0d] p-8 sm:p-12">
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(rgba(255,92,92,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,92,92,.07)_1px,transparent_1px)] bg-[size:32px_32px]"
            />
            <div className="relative flex min-h-64 flex-col justify-between border border-[#ff5c5c] p-6">
              <div className="flex items-center justify-between font-mono text-[#ff8a8a] text-xs uppercase tracking-[.18em]">
                <span>Archived component</span>
                <Code2 aria-hidden className="h-5 w-5" />
              </div>
              <div>
                <p className="font-mono text-[#ff5c5c] text-xs uppercase tracking-[.2em]">
                  React · Tailwind AI
                </p>
                <p className="mt-3 max-w-xl font-editorial text-4xl text-white sm:text-5xl">
                  Preview metadata recovered.
                  <br />
                  Original output unavailable.
                </p>
              </div>
            </div>
          </div>
          <dl className="grid bg-surface sm:grid-cols-2 lg:grid-cols-1">
            {archiveFacts.map(([term, value]) => (
              <div className="border-border border-b p-5 last:border-b-0" key={term}>
                <dt className="font-mono text-muted text-xs uppercase tracking-[.12em]">{term}</dt>
                <dd className="mt-2 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="grid gap-8 border-border border-b py-12 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="font-mono text-signal text-xs uppercase tracking-[.16em]">
              What is preserved
            </p>
            <h2 className="mt-4 font-editorial text-4xl tracking-[-.025em]">
              A useful record, not a recreated claim.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: FileSearch2,
                title: 'Indexed identity',
                text: 'The original title, component identifier, category, and recorded React context remain attached to the same URL.'
              },
              {
                icon: ShieldAlert,
                title: 'Clear limitation',
                text: 'No third-party website, missing source file, or historical live preview is presented as if CodeRocket still hosts it.'
              },
              {
                icon: CheckCircle2,
                title: 'Current guidance',
                text: 'The record now points developers toward a concrete production review for AI-generated Tailwind interfaces.'
              },
              {
                icon: Code2,
                title: 'Stable destination',
                text: 'This exact URL is intentionally preserved while unrelated former component routes remain permanently removed.'
              }
            ].map(({ icon: Icon, text, title }) => (
              <article className="border border-border bg-surface p-5" key={title}>
                <Icon aria-hidden className="h-5 w-5 text-signal" />
                <h3 className="mt-4 font-heading font-semibold">{title}</h3>
                <p className="mt-2 text-muted text-sm leading-6">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 py-12 lg:grid-cols-[1.15fr_.85fr]">
          <div className="border border-border bg-surface p-6 sm:p-8">
            <p className="font-mono text-accent text-xs uppercase tracking-[.16em]">
              Reviewing a Tailwind AI component today
            </p>
            <h2 className="mt-4 font-editorial text-4xl tracking-[-.025em]">
              Visual similarity is only the starting point.
            </h2>
            <p className="mt-4 max-w-3xl text-muted leading-7">
              A generated clone can look complete while still missing semantic landmarks, keyboard
              behavior, resilient responsive states, safe external resources, or maintainable
              component boundaries. The current guide explains how to review those gaps without
              treating AI output as automatically production-ready.
            </p>
            <Link
              className="mt-6 inline-flex items-center gap-2 font-mono text-accent text-sm hover:text-signal"
              href="/guides/tailwind-ai-components"
            >
              Read the Tailwind AI review checklist <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
          <aside className="border border-signal p-6 sm:p-8">
            <p className="font-mono text-signal text-xs uppercase tracking-[.16em]">
              Current CodeRocket
            </p>
            <h2 className="mt-4 font-heading font-semibold text-xl">
              The product now checks website health.
            </h2>
            <p className="mt-3 text-muted text-sm leading-6">
              CodeRocket no longer generates component clones. It monitors the pages that matter,
              keeps verified findings visible, and explains what needs attention.
            </p>
            <Link
              className="mt-6 inline-flex items-center gap-2 bg-accent px-5 py-3 font-mono font-semibold text-accent-foreground text-sm"
              href="/onboarding"
            >
              Check a website <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </aside>
        </section>
      </article>
    </main>
  )
}
