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
import { ProjectActionCenter } from '@/components/project-action-center'
import { ProjectCliSetup } from '@/components/project-cli-setup'
import { ProjectFindingsPanel } from '@/components/project-findings-panel'
import { ProjectHealthOverview } from '@/components/project-health-overview'
import { ShareReportButton } from '@/components/share-report-button'
import { WebsiteCheckProgress } from '@/components/website-check-progress'
import { getEnvironmentLabel, getTriggerLabel } from '@/lib/product-language'
import { getProjectDetail } from '@/lib/project-data'
import { createPrivateMetadata } from '@/lib/seo'
import { queueProjectAudit, updateFindingWorkflow } from './actions'

export const metadata = createPrivateMetadata('Monitored website')

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const project = await getProjectDetail(projectId)
  if (!project) notFound()
  const latest = project.latestAudit
  const firstCheckRunning = Boolean(project.activeCheck && !latest)
  const waitingForRunner = project.accessMode === 'private' && !latest && !project.activeCheck
  const firstResultPending = firstCheckRunning || waitingForRunner

  return (
    <ProductShell
      action={
        project.accessMode === 'private' ? (
          <ProjectCliSetup configured={project.apiTokenConfigured} projectId={project.id} />
        ) : (
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
        )
      }
      eyebrow="Monitored site"
      title={project.name}
    >
      <section className="border border-border bg-surface p-5 sm:p-6">
        {project.activeCheck ? (
          <WebsiteCheckProgress
            initial={project.activeCheck}
            projectId={project.id}
            siteUrl={project.url}
          />
        ) : (
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                {waitingForRunner ? (
                  <span className="inline-flex border border-accent bg-accent/10 px-2.5 py-1 font-mono font-semibold text-[10px] text-accent uppercase tracking-[.08em]">
                    Runner required
                  </span>
                ) : (
                  <GateBadge status={latest?.gate ?? 'needs_baseline'} />
                )}
                <span className="text-muted text-xs">
                  {latest
                    ? `Last checked ${latest.when}`
                    : waitingForRunner
                      ? 'Cloud checks are off for this site'
                      : 'Waiting for the first check'}
                </span>
              </div>
              <h2 className="mt-4 font-heading font-semibold text-2xl">
                {waitingForRunner
                  ? 'Connect the runner to start checking'
                  : getHeadline(latest?.gate, latest?.persistentCount ?? 0, project.checking)}
              </h2>
              <p className="mt-2 max-w-3xl text-muted leading-7">
                {waitingForRunner
                  ? 'This site needs a sign-in or private access. Run CodeRocket from GitHub Actions or your own environment; your normal password does not need to be stored here.'
                  : getExplanation(
                      latest?.gate,
                      latest?.blockingCount ?? 0,
                      latest?.persistentCount ?? 0,
                      project.checking
                    )}
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
        )}
      </section>

      <ProjectHealthOverview
        checkedPages={latest?.checkedPageCount ?? project.activeCheck?.current ?? 0}
        findings={project.findings}
        pending={firstResultPending}
        requestedPages={
          latest?.requestedPageCount ?? project.activeCheck?.total ?? project.pages.length
        }
      />

      <section
        aria-label="Latest check summary"
        className="mt-5 grid gap-px border border-border bg-border sm:grid-cols-4"
      >
        <Stat
          icon={AlertTriangle}
          label="New problems"
          tone="danger"
          value={firstResultPending ? '—' : String(latest?.blockingCount ?? 0)}
        />
        <Stat
          icon={Clock3}
          label="Still open"
          value={firstResultPending ? '—' : String(latest?.persistentCount ?? 0)}
        />
        <Stat
          icon={CheckCircle2}
          label="Fixed"
          tone="success"
          value={firstResultPending ? '—' : String(latest?.resolvedCount ?? 0)}
        />
        <div className="bg-surface p-5">
          <p className="text-muted text-sm">Pages checked</p>
          <p className="mt-4 font-heading font-semibold text-3xl">
            {waitingForRunner
              ? '—'
              : latest
                ? `${latest.checkedPageCount}/${latest.requestedPageCount}`
                : `${project.activeCheck?.current ?? 0}/${project.activeCheck?.total ?? project.pages.length}`}
          </p>
          <p className="mt-1 text-muted text-xs">
            {waitingForRunner
              ? 'Waiting for runner'
              : firstCheckRunning
                ? 'Checking now'
                : `Next check ${project.nextCheck}`}
          </p>
        </div>
      </section>

      <div className="mt-7">
        <ProjectFindingsPanel
          findings={project.findings}
          updateWorkflow={updateFindingWorkflow.bind(null, project.id)}
        />
      </div>

      <div className="mt-7">
        <ProjectActionCenter project={project} />
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
                    {getEnvironmentLabel(audit.environment)} · {getTriggerLabel(audit.trigger)}
                  </p>
                  <p className="mt-1 text-muted text-xs">{audit.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted text-xs">
                    {audit.blockingCount} new {audit.blockingCount === 1 ? 'problem' : 'problems'}
                  </span>
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

function getHeadline(gate: string | undefined, persistent: number, checking: boolean): string {
  if (checking) return 'A fresh check is underway'
  if (gate === 'failed') return 'New problems need your attention'
  if (gate === 'passed')
    return persistent > 0
      ? `No new problems. ${persistent} known ${persistent === 1 ? 'item is' : 'items are'} still open.`
      : 'No new problems found'
  if (gate === 'inconclusive') return 'Some pages could not be checked'
  if (gate === 'needs_baseline')
    return persistent > 0
      ? `First check saved with ${persistent} ${persistent === 1 ? 'item' : 'items'} to track`
      : 'Your first check is saved'
  return 'Your first check is being prepared'
}

function getExplanation(
  gate: string | undefined,
  blocking: number,
  persistent: number,
  checking: boolean
): string {
  if (checking)
    return 'CodeRocket is reading each monitored page. You can leave this page and come back later.'
  if (gate === 'failed')
    return `${blocking} new important ${blocking === 1 ? 'problem was' : 'problems were'} found since the previous complete check.`
  if (gate === 'passed')
    return persistent > 0
      ? 'The latest complete check found no new important problem. Known items stay visible until they are fixed or ignored.'
      : 'The latest complete check found no new important problem.'
  if (gate === 'inconclusive')
    return 'CodeRocket could not read every selected page. Known problems remain open and this result is not marked clear.'
  if (gate === 'needs_baseline')
    return 'This result is the starting point for future comparisons. Nothing is called new or fixed until the next complete check.'
  return 'This first result becomes the starting point. There is nothing to compare yet.'
}
