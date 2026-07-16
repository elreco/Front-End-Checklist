import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Play,
  RefreshCw
} from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GateBadge, ProductShell } from '@/components/product-shell'
import { ShareReportButton } from '@/components/share-report-button'
import { getProjectDetail, type ProjectFinding } from '@/lib/project-data'
import { queueProjectAudit } from './actions'

const notices: Record<string, string> = {
  queued: 'Your check is in the queue. Results will appear here when it finishes.',
  'already-running': 'A check is already running for this site.',
  'limit-reached': 'You have used the checks included in your plan for this month.',
  'queue-failed': 'The check could not be started. Please try again.'
}

export default async function ProjectPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ notice?: string }>
}) {
  const [{ projectId }, search] = await Promise.all([params, searchParams])
  const project = await getProjectDetail(projectId)
  if (!project) notFound()
  const latest = project.latestAudit
  const notice = search.notice ? notices[search.notice] : undefined

  return (
    <ProductShell
      action={
        <form action={queueProjectAudit.bind(null, projectId)}>
          <CodeRocketButton disabled={project.checking} size="sm" type="submit">
            {project.checking ? (
              <RefreshCw aria-hidden className="animate-spin" />
            ) : (
              <Play aria-hidden />
            )}
            {project.checking ? 'Checking…' : 'Check now'}
          </CodeRocketButton>
        </form>
      }
      eyebrow="Monitored site"
      title={project.name}
    >
      {notice ? (
        <p aria-live="polite" className="mb-6 border border-signal bg-surface p-4 text-sm">
          {notice}
        </p>
      ) : null}

      <section className="border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <GateBadge status={latest?.gate ?? 'needs_baseline'} />
              <span className="text-muted text-xs">
                {latest ? `Last checked ${latest.when}` : 'Waiting for the first check'}
              </span>
            </div>
            <h2 className="mt-4 font-heading font-semibold text-2xl">
              {getHeadline(latest?.gate, project.checking)}
            </h2>
            <p className="mt-2 max-w-3xl text-muted leading-7">
              {getExplanation(latest?.gate, latest?.blockingCount ?? 0, project.checking)}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <CodeRocketButton asChild size="sm" variant="outline">
              <a href={project.url} rel="noreferrer" target="_blank">
                Visit site <ExternalLink aria-hidden />
              </a>
            </CodeRocketButton>
            {latest?.status === 'succeeded' ? <ShareReportButton auditId={latest.id} /> : null}
          </div>
        </div>
      </section>

      <section
        aria-label="Latest check summary"
        className="mt-5 grid gap-px bg-border sm:grid-cols-4"
      >
        <Stat
          icon={AlertTriangle}
          label="New important"
          tone="danger"
          value={String(latest?.blockingCount ?? 0)}
        />
        <Stat icon={Clock3} label="Still present" value={String(latest?.persistentCount ?? 0)} />
        <Stat
          icon={CheckCircle2}
          label="Fixed since before"
          tone="success"
          value={String(latest?.resolvedCount ?? 0)}
        />
        <div className="bg-surface p-5">
          <p className="text-muted text-sm">Pages watched</p>
          <p className="mt-4 font-heading font-semibold text-3xl">{project.pages.length}</p>
          <p className="mt-1 text-muted text-xs">Next check {project.nextCheck}</p>
        </div>
      </section>

      <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section aria-labelledby="findings-title" className="border border-border bg-surface">
          <div className="border-border border-b p-5">
            <h2 className="font-heading font-semibold text-xl" id="findings-title">
              What changed
            </h2>
            <p className="mt-1 text-muted text-sm">
              Results from the latest check, written so anyone can act on them.
            </p>
          </div>
          {project.findings.length === 0 ? (
            <div className="p-7 text-center">
              <CheckCircle2 aria-hidden className="mx-auto h-7 w-7 text-success" />
              <p className="mt-3 font-semibold">
                {latest ? 'No changes to review' : 'Results will appear here'}
              </p>
              <p className="mx-auto mt-2 max-w-md text-muted text-sm leading-6">
                {latest
                  ? 'The latest check did not find any new, persistent, or resolved issues.'
                  : 'The first check creates the reference used for every comparison after it.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {project.findings.map(finding => (
                <FindingRow finding={finding} key={finding.id} />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <div className="border border-border bg-surface p-5">
            <h2 className="font-heading font-semibold text-lg">How to read this</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <Definition description="Appeared since the previous successful check." term="New" />
              <Definition
                description="Was already present and has not changed."
                term="Still present"
              />
              <Definition description="Was present before but is no longer found." term="Fixed" />
            </dl>
          </div>
          <div className="border border-border bg-background p-5">
            <h2 className="font-heading font-semibold text-lg">Pages monitored</h2>
            <ul className="mt-3 space-y-2 font-mono text-muted text-xs">
              {project.pages.map(path => (
                <li key={path}>{path}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <section aria-labelledby="history-title" className="mt-7 border border-border bg-surface">
        <div className="flex items-center justify-between border-border border-b p-5">
          <div>
            <h2 className="font-heading font-semibold text-xl" id="history-title">
              Recent checks
            </h2>
            <p className="mt-1 text-muted text-xs">The latest activity for this site.</p>
          </div>
          <Link className="font-mono text-accent text-xs hover:text-signal" href="/audits">
            All history
          </Link>
        </div>
        {project.audits.length === 0 ? (
          <p className="p-5 text-muted text-sm">No completed checks yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {project.audits.slice(0, 5).map(audit => (
              <li className="flex flex-wrap items-center justify-between gap-4 p-5" key={audit.id}>
                <div>
                  <p className="font-semibold text-sm">
                    {audit.environment === 'preview' ? 'Test version' : 'Live website'} ·{' '}
                    {audit.trigger === 'scheduled'
                      ? 'Automatic'
                      : audit.trigger === 'manual'
                        ? 'Started by you'
                        : 'GitHub'}
                  </p>
                  <p className="mt-1 text-muted text-xs">{audit.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted text-xs">{audit.blockingCount} new important</span>
                  <GateBadge status={audit.gate} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </ProductShell>
  )
}

function FindingRow({ finding }: { finding: ProjectFinding }) {
  const label =
    finding.status === 'persistent'
      ? 'Still present'
      : finding.status === 'resolved'
        ? 'Fixed'
        : 'New'
  const tone =
    finding.status === 'new'
      ? 'text-danger'
      : finding.status === 'resolved'
        ? 'text-success'
        : 'text-muted'
  return (
    <article className="grid gap-3 p-5 sm:grid-cols-[110px_minmax(0,1fr)_auto]">
      <span className={`font-mono text-[10px] uppercase tracking-[.1em] ${tone}`}>
        {label} · {finding.priority}
      </span>
      <div>
        <h3 className="font-semibold">{finding.title}</h3>
        <p className="mt-1 text-muted text-sm leading-6">{finding.message}</p>
        <p className="mt-2 font-mono text-muted text-xs">Page: {finding.path}</p>
      </div>
      <Link
        className="font-mono text-accent text-xs hover:text-signal"
        href={`/docs/rules/${finding.rule}`}
      >
        How to fix →
      </Link>
    </article>
  )
}

function Stat({
  icon: Icon,
  label,
  tone,
  value
}: {
  icon: typeof AlertTriangle
  label: string
  tone?: 'danger' | 'success'
  value: string
}) {
  const color =
    tone === 'danger' ? 'text-danger' : tone === 'success' ? 'text-success' : 'text-signal'
  return (
    <div className="bg-surface p-5">
      <Icon aria-hidden className={`h-5 w-5 ${color}`} />
      <p className="mt-4 text-muted text-sm">{label}</p>
      <p className="font-heading font-semibold text-3xl">{value}</p>
    </div>
  )
}

function Definition({ description, term }: { description: string; term: string }) {
  return (
    <div>
      <dt className="font-semibold">{term}</dt>
      <dd className="mt-1 text-muted text-xs leading-5">{description}</dd>
    </div>
  )
}

function getHeadline(gate: string | undefined, checking: boolean): string {
  if (checking) return 'A fresh check is underway'
  if (gate === 'failed') return 'Important changes need your attention'
  if (gate === 'passed') return 'No new important problems found'
  return 'Your first reference check is being prepared'
}

function getExplanation(gate: string | undefined, blocking: number, checking: boolean): string {
  if (checking)
    return 'CodeRocket is reading each monitored page. You can leave this page and come back later.'
  if (gate === 'failed')
    return `${blocking} new high-priority ${blocking === 1 ? 'problem was' : 'problems were'} found since the previous successful check.`
  if (gate === 'passed')
    return 'The site may still have older issues, but nothing newly introduced is serious enough to block a release.'
  return 'This first result becomes the reference point. It does not block a release because there is nothing to compare yet.'
}
