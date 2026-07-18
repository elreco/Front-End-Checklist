import { AlertTriangle, CheckCircle2, Clock3 } from '@repo/design-system/icons'
import { notFound } from 'next/navigation'
import { GateBadge, ProductShell } from '@/components/product-shell'
import { ProjectAccessRecovery } from '@/components/project-access-recovery'
import { ProjectActionCenter } from '@/components/project-action-center'
import { ProjectCheckHistory } from '@/components/project-check-history'
import { ProjectFindingsPanel } from '@/components/project-findings-panel'
import { ProjectHeaderActions } from '@/components/project-header-actions'
import { ProjectHealthOverview } from '@/components/project-health-overview'
import { ProjectLevelPanel } from '@/components/project-level-panel'
import { ProjectPrimaryAction } from '@/components/project-primary-action'
import { SiteVisual } from '@/components/site-visual'
import { WebsiteCheckProgress } from '@/components/website-check-progress'
import { getProjectDetail } from '@/lib/project-data'
import { queueProjectAudit, updateFindingWorkflow } from './actions'

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const project = await getProjectDetail(projectId)
  if (!project) notFound()
  const latest = project.latestAudit
  const firstCheckRunning = Boolean(project.activeCheck && !latest)
  const waitingForCi = project.accessMode !== 'public' && !latest && !project.activeCheck
  const firstResultPending = firstCheckRunning || waitingForCi

  return (
    <ProductShell
      action={
        <ProjectPrimaryAction
          project={project}
          queueAction={queueProjectAudit.bind(null, projectId)}
        />
      }
      eyebrow="Monitored site"
      title={project.name}
    >
      <section className="border border-border bg-surface p-5 sm:p-6">
        {project.activeCheck ? (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <SiteVisual
              imageUrl={project.socialImageUrl}
              name={project.name}
              pending
              size="detail"
            />
            <div className="min-w-0 flex-1">
              <WebsiteCheckProgress
                initial={project.activeCheck}
                projectId={project.id}
                siteUrl={project.url}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-col items-start gap-4 sm:flex-row">
              <SiteVisual imageUrl={project.socialImageUrl} name={project.name} size="detail" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  {waitingForCi ? (
                    <span className="inline-flex border border-accent bg-accent/10 px-2.5 py-1 font-mono font-semibold text-[10px] text-accent uppercase tracking-[.08em]">
                      Secure access required
                    </span>
                  ) : (
                    <GateBadge status={latest?.gate ?? 'needs_baseline'} />
                  )}
                  <span className="text-muted text-xs">
                    {latest
                      ? `Last checked ${latest.when}`
                      : waitingForCi
                        ? 'Cloud checks are off for this site'
                        : 'Waiting for the first check'}
                  </span>
                </div>
                <h2 className="mt-4 font-heading font-semibold text-2xl">
                  {waitingForCi
                    ? 'Connect secure access to start'
                    : getHeadline(latest?.gate, latest?.persistentCount ?? 0, project.checking)}
                </h2>
                <p className="mt-2 max-w-3xl text-muted leading-7">
                  {waitingForCi
                    ? 'These pages need sign-in or private access. Send the setup to a developer, or run the check from an environment that can already open them.'
                    : getExplanation(
                        latest?.gate,
                        latest?.blockingCount ?? 0,
                        latest?.persistentCount ?? 0,
                        project.checking
                      )}
                </p>
              </div>
            </div>
            <ProjectHeaderActions project={project} showCiSetup={waitingForCi} />
          </div>
        )}
        {latest?.gate === 'inconclusive' && !project.activeCheck ? (
          <ProjectAccessRecovery
            project={project}
            retryAction={queueProjectAudit.bind(null, projectId)}
          />
        ) : null}
      </section>

      <ProjectLevelPanel project={project} />

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
            {waitingForCi
              ? '—'
              : latest
                ? `${latest.checkedPageCount}/${latest.requestedPageCount}`
                : `${project.activeCheck?.current ?? 0}/${project.activeCheck?.total ?? project.pages.length}`}
          </p>
          <p className="mt-1 text-muted text-xs">
            {waitingForCi
              ? 'Waiting for secure access'
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

      <ProjectCheckHistory audits={project.audits} />
    </ProductShell>
  )
}

/** Render one compact latest-check metric with an optional semantic tone. */
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

/** Select the project headline from the latest reliable gate state. */
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

/** Explain the latest gate without presenting partial coverage as healthy. */
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
