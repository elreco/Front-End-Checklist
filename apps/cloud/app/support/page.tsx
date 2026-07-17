import {
  ArrowRight,
  BookOpen,
  CreditCard,
  Mail,
  Radar,
  ShieldCheck
} from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createPublicMetadata, SUPPORT_EMAIL } from '@/lib/seo'

export const metadata: Metadata = createPublicMetadata({
  title: 'Support',
  description:
    'Get help with CodeRocket website checks, account access, billing, security, CI checks, and client reports.',
  path: '/support',
  keywords: ['CodeRocket support', 'website monitoring help']
})

const supportTopics = [
  {
    icon: Radar,
    title: 'Website checks',
    description:
      'Send the website URL, affected page, and check time. Add the check ID when one is available.'
  },
  {
    icon: ShieldCheck,
    title: 'Private access & security',
    description:
      'Never email passwords, cookies, tokens, or secret headers. Describe the access method instead.'
  },
  {
    icon: CreditCard,
    title: 'Plans & billing',
    description:
      'Use the email attached to the CodeRocket account and include the Stripe invoice number.'
  }
]

export default function SupportPage() {
  return (
    <main className="px-5 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <header className="grid gap-8 border border-border bg-surface p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="font-mono text-signal text-xs uppercase tracking-[.18em]">
              CodeRocket support
            </p>
            <h1 className="mt-5 max-w-3xl font-editorial text-5xl tracking-[-.035em] sm:text-7xl">
              Tell us what is blocking you.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted leading-8">
              We can help with website checks, restricted pages, GitHub, GitLab, or Bitbucket CI,
              account access, billing, and shared reports.
            </p>
          </div>
          <CodeRocketButton asChild size="lg">
            <a href={`mailto:${SUPPORT_EMAIL}`}>
              <Mail aria-hidden /> Email support
            </a>
          </CodeRocketButton>
        </header>

        <section aria-labelledby="before-email" className="mt-8">
          <h2 className="font-heading font-semibold text-2xl" id="before-email">
            What to include
          </h2>
          <div className="mt-5 grid gap-px border border-border bg-border md:grid-cols-3">
            {supportTopics.map(({ description, icon: Icon, title }) => (
              <article className="bg-surface p-6" key={title}>
                <Icon aria-hidden className="h-5 w-5 text-signal" />
                <h3 className="mt-5 font-heading font-semibold text-lg">{title}</h3>
                <p className="mt-2 text-muted text-sm leading-6">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <article className="border border-border bg-surface p-7">
            <BookOpen aria-hidden className="h-5 w-5 text-accent" />
            <h2 className="mt-5 font-heading font-semibold text-2xl">Find an answer now</h2>
            <p className="mt-3 text-muted leading-7">
              The official guide explains cloud and CI checks, guided resolutions, and every rule in
              the synchronized reference.
            </p>
            <CodeRocketButton asChild className="mt-6" variant="outline">
              <Link href="/docs">
                Open documentation <ArrowRight aria-hidden />
              </Link>
            </CodeRocketButton>
          </article>
          <article className="border border-border bg-surface p-7">
            <Mail aria-hidden className="h-5 w-5 text-accent" />
            <h2 className="mt-5 font-heading font-semibold text-2xl">Contact</h2>
            <p className="mt-3 text-muted leading-7">
              One support address covers product help, privacy requests, security reports, and
              billing questions.
            </p>
            <a
              className="mt-6 inline-block font-mono text-signal text-sm hover:text-foreground"
              href={`mailto:${SUPPORT_EMAIL}`}
            >
              {SUPPORT_EMAIL}
            </a>
          </article>
        </section>
      </div>
    </main>
  )
}
