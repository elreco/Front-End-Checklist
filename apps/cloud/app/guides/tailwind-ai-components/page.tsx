import {
  ArrowRight,
  CheckCircle2,
  Code2,
  Eye,
  Gauge,
  Keyboard,
  Layers3,
  ShieldCheck
} from '@repo/design-system/icons'
import type { Metadata } from 'next'
import Link from 'next/link'
import { DocsBreadcrumbs, DocsCodeBlock } from '@/components/docs-shell'
import { JsonLd } from '@/components/json-ld'
import { absoluteUrl, createPublicMetadata, SITE_URL } from '@/lib/seo'

const GUIDE_PATH = '/guides/tailwind-ai-components'
const GUIDE_TITLE = 'Tailwind AI components: a production review checklist'

export const metadata: Metadata = createPublicMetadata({
  title: GUIDE_TITLE,
  absoluteTitle: true,
  description:
    'Review AI-generated Tailwind CSS components for semantic HTML, accessibility, responsive behavior, performance, and maintainability before shipping.',
  path: GUIDE_PATH,
  type: 'article',
  keywords: [
    'Tailwind AI',
    'Tailwind AI components',
    'AI generated Tailwind CSS',
    'review AI generated frontend code',
    'Tailwind accessibility checklist'
  ]
})

const reviewAreas = [
  {
    icon: Layers3,
    title: 'Semantic structure',
    description:
      'Replace generic wrappers with the heading, navigation, list, form, and landmark elements that describe the interface.'
  },
  {
    icon: Keyboard,
    title: 'Keyboard behavior',
    description:
      'Use native controls first, preserve visible focus, and verify that every interaction works without a pointer.'
  },
  {
    icon: Eye,
    title: 'Readable states',
    description:
      'Check contrast, zoom, validation messages, loading states, and content that should remain understandable without color.'
  },
  {
    icon: Gauge,
    title: 'Responsive performance',
    description:
      'Test real content at narrow widths, reserve media space, and remove decorative code that delays the useful interface.'
  },
  {
    icon: Code2,
    title: 'Maintainable utilities',
    description:
      'Consolidate repeated patterns into shared components and keep arbitrary values for genuinely exceptional design decisions.'
  },
  {
    icon: ShieldCheck,
    title: 'Safe output',
    description:
      'Treat generated markup as untrusted until links, forms, embedded HTML, dependencies, and external resources are reviewed.'
  }
]

const guideUrl = absoluteUrl(GUIDE_PATH)
const guideStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'TechArticle',
      '@id': `${guideUrl}#article`,
      headline: GUIDE_TITLE,
      description:
        'A practical review workflow for turning AI-generated Tailwind CSS components into production-ready frontend code.',
      url: guideUrl,
      mainEntityOfPage: guideUrl,
      inLanguage: 'en',
      author: { '@id': `${SITE_URL}/#organization` },
      publisher: { '@id': `${SITE_URL}/#organization` },
      about: ['Tailwind CSS', 'AI-assisted development', 'Frontend quality']
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: GUIDE_TITLE, item: guideUrl }
      ]
    }
  ]
}

const generatedButton = `<div
  className="rounded-lg bg-violet-600 px-5 py-3 text-white"
  onClick={startTrial}
>
  Start free
</div>`

const reviewedButton = `<button
  className="rounded-lg bg-violet-600 px-5 py-3 text-white
    hover:bg-violet-500 focus-visible:outline-2
    focus-visible:outline-offset-2 focus-visible:outline-violet-300"
  onClick={startTrial}
  type="button"
>
  Start free
</button>`

/** Publish an evergreen review workflow for AI-generated Tailwind components. */
export default function TailwindAiComponentsGuidePage() {
  return (
    <main className="px-5 py-12 sm:py-20">
      <JsonLd data={guideStructuredData} />
      <article className="mx-auto max-w-6xl">
        <DocsBreadcrumbs
          items={[{ href: '/', label: 'Home' }, { label: 'Tailwind AI components' }]}
        />

        <header className="grid gap-8 border-border border-b pb-12 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <p className="font-mono text-signal text-xs uppercase tracking-[.18em]">
              AI-assisted frontend quality
            </p>
            <h1 className="mt-5 max-w-4xl font-editorial text-5xl leading-[.94] tracking-[-.035em] sm:text-7xl">
              Tailwind AI components:
              <br />
              <em>review before you ship.</em>
            </h1>
          </div>
          <p className="max-w-2xl text-lg text-muted leading-8">
            AI can produce a convincing Tailwind interface in seconds. Production quality still
            depends on the details a screenshot cannot prove: semantics, keyboard access, real
            content, resilient layouts, and safe behavior.
          </p>
        </header>

        <section className="py-12">
          <p className="font-mono text-accent text-xs uppercase tracking-[.16em]">
            The practical checklist
          </p>
          <h2 className="mt-4 max-w-3xl font-editorial text-4xl tracking-[-.025em] sm:text-5xl">
            Six reviews turn generated markup into dependable frontend code.
          </h2>
          <div className="mt-8 grid gap-px border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
            {reviewAreas.map(({ description, icon: Icon, title }) => (
              <article className="bg-surface p-6" key={title}>
                <Icon aria-hidden className="h-5 w-5 text-signal" />
                <h3 className="mt-5 font-heading font-semibold text-lg">{title}</h3>
                <p className="mt-3 text-muted text-sm leading-6">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-border border-y py-12 lg:grid-cols-2">
          <div>
            <p className="font-mono text-danger text-xs uppercase tracking-[.16em]">
              Generated appearance
            </p>
            <h2 className="mt-4 font-editorial text-4xl tracking-[-.025em]">
              A clickable box is not yet a button.
            </h2>
            <p className="mt-4 text-muted leading-7">
              The generated version looks correct with a mouse but has no native keyboard behavior
              or button semantics. The reviewed version keeps the same visual direction while
              restoring the browser behavior users expect.
            </p>
            <div className="mt-6">
              <DocsCodeBlock language="tsx">{generatedButton}</DocsCodeBlock>
            </div>
          </div>
          <div className="lg:pt-12">
            <p className="font-mono text-success text-xs uppercase tracking-[.16em]">
              Reviewed implementation
            </p>
            <div className="mt-6">
              <DocsCodeBlock language="tsx">{reviewedButton}</DocsCodeBlock>
            </div>
            <ul className="mt-6 space-y-3 text-muted text-sm leading-6">
              {[
                'Native keyboard and assistive-technology behavior',
                'Visible focus without a second interaction system',
                'The same Tailwind styling, now attached to the correct element'
              ].map(item => (
                <li className="flex gap-3" key={item}>
                  <CheckCircle2 aria-hidden className="mt-1 h-4 w-4 shrink-0 text-success" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid gap-6 py-12 lg:grid-cols-[1.15fr_.85fr]">
          <div className="border border-border bg-surface p-6 sm:p-8">
            <p className="font-mono text-signal text-xs uppercase tracking-[.16em]">
              A repeatable verification loop
            </p>
            <ol className="mt-6 grid gap-5 sm:grid-cols-2">
              {[
                ['01', 'Read the generated component and identify every real interaction.'],
                ['02', 'Test keyboard, zoom, narrow widths, long text, and failure states.'],
                ['03', 'Run automated checks only for behavior they can actually prove.'],
                ['04', 'Fix the source, deploy it, and verify the rendered page again.']
              ].map(([number, text]) => (
                <li className="border-border border-l pl-4" key={number}>
                  <span className="font-mono text-accent text-xs">{number}</span>
                  <p className="mt-2 text-sm leading-6">{text}</p>
                </li>
              ))}
            </ol>
          </div>
          <aside className="border border-border p-6 sm:p-8">
            <p className="font-mono text-muted text-xs uppercase tracking-[.16em]">
              From the CodeRocket archive
            </p>
            <h2 className="mt-4 font-heading font-semibold text-xl">
              One legacy Tailwind AI component record is preserved.
            </h2>
            <p className="mt-3 text-muted text-sm leading-6">
              The archived record documents what can be recovered from a previously indexed
              CodeRocket component without pretending that its original preview or source still
              exists.
            </p>
            <Link
              className="mt-6 inline-flex items-center gap-2 font-mono text-accent text-xs hover:text-signal"
              href="/components/7igf4HoGRDc"
            >
              Open the archived component <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </aside>
        </section>

        <section className="border border-signal bg-surface p-6 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-8">
          <div>
            <p className="font-mono text-signal text-xs uppercase tracking-[.16em]">
              Check the rendered result
            </p>
            <h2 className="mt-3 font-editorial text-4xl tracking-[-.025em]">
              Put the important pages under review.
            </h2>
            <p className="mt-3 max-w-2xl text-muted text-sm leading-6">
              CodeRocket checks the frontend evidence it can verify and keeps manual decisions
              explicit instead of marking generated code safe by assumption.
            </p>
          </div>
          <Link
            className="mt-6 inline-flex shrink-0 items-center gap-2 bg-accent px-5 py-3 font-mono font-semibold text-accent-foreground text-sm sm:mt-0"
            href="/onboarding"
          >
            Check a website <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </section>
      </article>
    </main>
  )
}
