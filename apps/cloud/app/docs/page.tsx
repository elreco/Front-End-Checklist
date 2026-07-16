import {
  ArrowRight,
  GitPullRequest,
  ListChecks,
  Radar,
  ShieldCheck
} from '@repo/design-system/icons'
import Link from 'next/link'
import { DocsHeader } from '@/components/docs-shell'
import {
  DOCUMENTATION_RULES,
  DOCUMENTATION_RULESET_VERSION,
  getDocumentationCategories
} from '@/lib/docs'

const sections = [
  {
    href: '/docs/audits',
    title: 'How checks work',
    description:
      'Understand safe page fetching, health areas, coverage, baselines, and change detection.',
    icon: Radar
  },
  {
    href: '/docs/cli',
    title: 'CLI & GitHub',
    description:
      'Audit a preview from CI, authenticate with a project token, and use exit codes for PR protection.',
    icon: GitPullRequest
  },
  {
    href: '/docs/rules',
    title: 'Rules reference',
    description:
      'Browse the complete rule corpus that CodeRocket versions and uses as its technical foundation.',
    icon: ListChecks
  },
  {
    href: '/docs/security',
    title: 'Security model',
    description:
      'Review SSRF protections, tenant isolation, secret storage, signed webhooks, and private reports.',
    icon: ShieldCheck
  }
]

export default function DocumentationPage() {
  const categories = getDocumentationCategories()
  return (
    <>
      <DocsHeader
        description="The canonical reference for what CodeRocket can check automatically, what needs developer or manual evidence, and how every website health result is produced."
        eyebrow="Official CodeRocket reference"
        title="Know exactly what CodeRocket checked."
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
              Automatically synchronized
            </p>
            <h2 className="mt-4 font-editorial text-4xl tracking-[-.025em]">
              The fork is the documentation source.
            </h2>
            <p className="mt-4 max-w-2xl text-muted leading-7">
              CodeRocket reads the rule files directly from the maintained fork. No rule is copied
              into this app. An upstream merge changes this reference and the audit ruleset together
              on the next build.
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
