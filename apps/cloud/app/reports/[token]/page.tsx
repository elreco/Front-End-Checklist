import { CODEROCKET_TAGLINE, CodeRocketLogo } from '@repo/design-system/coderocket-logo'
import { ShieldCheck } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GateBadge } from '@/components/product-ui'
import { WebsiteLevelBadge, WebsiteLevelMark, WebsiteLevelScale } from '@/components/website-level'
import { getSharedReport, type SharedReportFinding } from '@/lib/shared-report-data'
import { getWebsiteLevelPresentation } from '@/lib/website-level-presentation'

/** Describe a private shared report without allowing it into the public search index. */
export async function generateMetadata({
  params
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const report = await getSharedReport(token)
  if (!report) return { title: 'Report unavailable' }
  const level = getWebsiteLevelPresentation(report.level.level)
  const title = `${report.project.name} · ${level.label} website level`
  const description = `${report.audit.checkedPages}/${report.audit.requestedPages} selected pages checked with CodeRocket. Level: ${level.label}.`
  return {
    title,
    description,
    robots: { follow: false, index: false },
    openGraph: {
      title,
      description,
      images: [`/reports/${token}/opengraph-image`],
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/reports/${token}/opengraph-image`]
    }
  }
}

export default async function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const report = await getSharedReport(token)
  if (!report) notFound()
  const presentation = getWebsiteLevelPresentation(report.level.level)

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4 border-border border-b pb-6">
        <CodeRocketLogo
          className="h-10 w-10"
          tagline={CODEROCKET_TAGLINE}
          wordmarkClassName="text-xl"
        />
        <span className="inline-flex items-center gap-2 text-muted text-xs">
          <ShieldCheck aria-hidden className="h-4 w-4" />
          Private snapshot · shared by the site owner
        </span>
      </header>

      <section className="grid gap-8 py-10 lg:grid-cols-[auto_1fr] lg:items-center">
        <WebsiteLevelMark level={report.level.level} />
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-[10px] text-signal uppercase tracking-[.18em]">
              Website health report
            </p>
            <WebsiteLevelBadge level={report.level.level} />
          </div>
          <h1 className="mt-3 font-editorial text-5xl leading-none sm:text-6xl">
            {report.project.name}
          </h1>
          <p className="mt-4 max-w-3xl text-muted leading-7">
            <span className="font-semibold text-foreground">{presentation.label}.</span>{' '}
            {presentation.description} This level belongs to one saved check and does not update
            when the website changes.
          </p>
          <p className="mt-3 font-mono text-muted text-xs">
            {report.project.url || 'Website URL withheld'} ·{' '}
            {formatReportDate(report.audit.completedAt, 'Date unavailable')}
          </p>
        </div>
      </section>

      <section className="grid gap-px border border-border bg-border sm:grid-cols-4">
        <ReportFact
          label="Selected pages"
          value={`${report.audit.checkedPages}/${report.audit.requestedPages}`}
        />
        <ReportFact label="New problems" value={String(report.audit.newCount)} />
        <ReportFact label="Still open" value={String(report.audit.persistentCount)} />
        <ReportFact label="Fixed in this check" value={String(report.audit.resolvedCount)} />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <section className="border border-border bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] text-muted uppercase tracking-[.16em]">
                How the level was calculated
              </p>
              <h2 className="mt-2 font-heading font-semibold text-xl">
                The most serious open problem sets the level
              </h2>
            </div>
            <WebsiteLevelBadge level={report.level.level} />
          </div>
          <div className="mt-6">
            <WebsiteLevelScale result={report.level} />
          </div>
          <p className="mt-5 border border-border bg-background p-4 text-muted text-xs leading-5">
            Bronze allows important problems, Silver allows recommended problems, Gold allows only
            optional improvements, and Platinum has no open applicable automated finding. A report
            is not a certification and covers only the pages and rule set shown here.
          </p>
        </section>

        <section className="border border-border bg-surface p-5 sm:p-6">
          <p className="font-mono text-[10px] text-muted uppercase tracking-[.16em]">
            Check details
          </p>
          <div className="mt-4 flex items-center justify-between gap-3 border border-border bg-background p-4">
            <span className="text-muted text-sm">Change result</span>
            <GateBadge status={report.audit.gate} />
          </div>
          <dl className="mt-3 divide-y divide-border border border-border bg-background px-4">
            <ReportDetail label="Rule set" value={report.audit.rulesetVersion} />
            <ReportDetail
              label="Coverage"
              value={`${report.audit.checkedPages} of ${report.audit.requestedPages} pages`}
            />
            <ReportDetail label="Source" value="CodeRocket automated website check" />
            <ReportDetail
              label="Link expires"
              value={formatReportDate(report.expiresAt, 'No expiry')}
            />
          </dl>
        </section>
      </div>

      <section className="mt-8 border border-border bg-surface">
        <div className="border-border border-b p-5 sm:p-6">
          <h2 className="font-heading font-semibold text-xl">What this check found</h2>
          <p className="mt-1 text-muted text-sm leading-6">
            Findings are grouped by the exact saved evidence. New, still open, and fixed describe
            the change from the previous complete check.
          </p>
        </div>
        {report.findings.length === 0 ? (
          <p className="p-6 text-muted text-sm">No individual finding was recorded.</p>
        ) : (
          <div className="divide-y divide-border">
            {report.findings.map(finding => (
              <ReportFinding finding={finding} key={finding.id} />
            ))}
          </div>
        )}
      </section>

      <footer className="mt-8 flex flex-col justify-between gap-5 border border-border bg-surface p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading font-semibold text-xl">Check your own website</h2>
          <p className="mt-1 text-muted text-sm">
            Start with one website and get a transparent level after the first complete check.
          </p>
        </div>
        <CodeRocketButton asChild>
          <Link href="/onboarding">Start free</Link>
        </CodeRocketButton>
      </footer>
    </main>
  )
}

/** Render one metric from the immutable audit snapshot. */
function ReportFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface p-5">
      <p className="text-muted text-xs">{label}</p>
      <p className="mt-2 font-heading font-semibold text-2xl">{value}</p>
    </div>
  )
}

/** Render one report calculation detail. */
function ReportDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 text-xs">
      <dt className="text-muted">{label}</dt>
      <dd className="break-all text-right font-mono">{value}</dd>
    </div>
  )
}

/** Render one saved finding in plain language. */
function ReportFinding({ finding }: { finding: SharedReportFinding }) {
  return (
    <article className="grid gap-3 p-5 sm:grid-cols-[150px_1fr] sm:p-6">
      <p className="font-mono text-[10px] text-muted uppercase tracking-[.08em]">
        {findingStatus(finding.status)} · {findingPriority(finding.priority)}
      </p>
      <div>
        <h3 className="font-semibold">{finding.title}</h3>
        <p className="mt-1 text-muted text-sm leading-6">{finding.message}</p>
        <p className="mt-2 font-mono text-muted text-xs">Page {finding.path}</p>
      </div>
    </article>
  )
}

/** Format report dates consistently while handling absent expiry or completion values. */
function formatReportDate(value: string | undefined, fallback: string): string {
  if (!value) return fallback
  return new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date(value))
}

/** Translate regression states into client-friendly language. */
function findingStatus(value: SharedReportFinding['status']): string {
  if (value === 'persistent') return 'Still open'
  if (value === 'resolved') return 'Fixed'
  return 'New'
}

/** Translate technical priorities into the public product vocabulary. */
function findingPriority(value: SharedReportFinding['priority']): string {
  if (value === 'critical') return 'Urgent'
  if (value === 'high') return 'Important'
  if (value === 'medium') return 'Recommended'
  return 'Optional'
}
