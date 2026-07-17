import {
  ArrowRight,
  BrainCircuit,
  GitPullRequest,
  ListChecks,
  Radar,
  ShieldCheck
} from '@repo/design-system/icons'
import type { Metadata } from 'next'
import Link from 'next/link'
import { DocsHeader } from '@/components/docs-shell'
import {
  DOCUMENTATION_RULES,
  DOCUMENTATION_RULESET_VERSION,
  getDocumentationCategories
} from '@/lib/docs'
import { createPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = createPublicMetadata({
  title: 'Documentation',
  description:
    'Official CodeRocket documentation for website checks, AI fix guidance, private runners, security, and the synchronized frontend rules reference.',
  path: '/docs',
  image: '/docs/opengraph-image',
  keywords: ['CodeRocket documentation', 'website health checks', 'frontend checklist rules']
})

const sections = [
  {
    href: '/docs/audits',
    title: 'Start here: how checks work',
    description: 'See what CodeRocket reads, what it checks, and how it decides what is new.',
    icon: Radar
  },
  {
    href: '/docs/ai',
    title: 'AI explanations and fix plans',
    description:
      'See how evidence, official rules, safety boundaries, and fresh verification work together.',
    icon: BrainCircuit
  },
  {
    href: '/docs/cli',
    title: 'Runner and GitHub setup',
    description: 'Check private pages or a test version from an environment that can reach them.',
    icon: GitPullRequest
  },
  {
    href: '/docs/rules',
    title: 'Browse every website rule',
    description: 'Open the complete, searchable reference behind CodeRocket checks and guidance.',
    icon: ListChecks
  },
  {
    href: '/docs/security',
    title: 'How your data stays safe',
    description:
      'Understand safe website access, private accounts, protected keys, and shared reports.',
    icon: ShieldCheck
  }
]

export default function DocumentationPage() {
  const categories = getDocumentationCategories()
  return (
    <>
      <DocsHeader
        description="Start with the simple explanation, then open the exact technical rule whenever you need more detail."
        eyebrow="Official CodeRocket reference"
        title="Help that starts simple and goes deep."
      />

      <section className="grid gap-4 py-10 sm:grid-cols-2">
        {sections.map(({ description, href, icon: Icon, title }) => (
          <article className="relative border border-border bg-surface p-6" key={href}>
            <Icon aria-hidden className="h-6 w-6 text-signal" />
            <h2 className="mt-6 font-heading font-semibold text-xl">
              <Link className="after:absolute after:inset-0 after:content-['']" href={href}>
                {title}
              </Link>
            </h2>
            <p className="mt-3 text-muted leading-7">{description}</p>
            <ArrowRight aria-hidden className="mt-6 h-4 w-4 text-accent" />
          </article>
        ))}
      </section>

      <section className="border border-border bg-surface">
        <div className="grid sm:grid-cols-[1fr_auto]">
          <div className="p-6 sm:p-8">
            <p className="font-mono text-signal text-xs uppercase tracking-[.16em]">
              Kept up to date automatically
            </p>
            <h2 className="mt-4 font-editorial text-4xl tracking-[-.025em]">
              One source for checks and guidance.
            </h2>
            <p className="mt-4 max-w-2xl text-muted leading-7">
              CodeRocket reads this documentation from the same maintained Front-End Checklist files
              used to build the product. When the fork is updated and deployed, the guide is updated
              too. New automatic checks are still reviewed before they can create an alert.
            </p>
          </div>
          <dl className="grid grid-cols-2 border-border border-t sm:min-w-72 sm:grid-cols-1 sm:border-t-0 sm:border-l">
            <div className="p-5">
              <dt className="font-mono text-muted text-xs uppercase">Rules</dt>
              <dd className="mt-2 font-editorial text-4xl">{DOCUMENTATION_RULES.length}</dd>
            </div>
            <div className="border-border border-l p-5 sm:border-t sm:border-l-0">
              <dt className="font-mono text-muted text-xs uppercase">Categories</dt>
              <dd className="mt-2 font-editorial text-4xl">{categories.length}</dd>
            </div>
          </dl>
        </div>
        <div className="border-border border-t px-6 py-4 font-mono text-muted text-xs sm:px-8">
          Current ruleset · {DOCUMENTATION_RULESET_VERSION}
        </div>
      </section>
    </>
  )
}
