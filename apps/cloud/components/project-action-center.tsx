import {
  AlertTriangle,
  BellRing,
  BrainCircuit,
  CheckCircle2,
  Cloud,
  LockKeyhole,
  ShieldCheck
} from '@repo/design-system/icons'
import { Badge } from '@repo/design-system/ui/badge'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import type { ProjectDetail } from '@/lib/project-data'
import { getProjectRecoveryKind } from '@/lib/project-recovery'
import { UpgradeLink } from './plan-limit-upsell'
import { ProjectActionStep, ProjectCoverageMetric } from './project-action-center-parts'
import { ProjectCliSetup } from './project-cli-setup'
import { ProjectPreviewProtectionCard } from './project-preview-protection-card'
/** Shows next actions, monitoring coverage, integrations, and contextual plan value. */
export function ProjectActionCenter({ project }: { project: ProjectDetail }) {
  const openFindings = project.findings.filter(
    finding => finding.status !== 'resolved' && finding.workflowStatus !== 'muted'
  )
  const important = new Set(
    openFindings
      .filter(finding => finding.priority === 'critical' || finding.priority === 'high')
      .map(finding => finding.rule)
  ).size
  const newFindings = new Set(
    openFindings.filter(finding => finding.status === 'new').map(finding => finding.rule)
  ).size
  const existingFindings = new Set(
    openFindings.filter(finding => finding.status === 'persistent').map(finding => finding.rule)
  ).size
  const recoveryKind =
    project.latestAudit?.gate === 'inconclusive'
      ? getProjectRecoveryKind(project.latestPages.filter(page => !page.reachable))
      : undefined
  const access = accessContent(project, recoveryKind)
  const AccessIcon = access.icon
  return (
    <aside
      aria-label="Website monitoring guidance"
      className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
    >
      <section className="h-full border border-signal bg-signal/10 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-signal text-signal">
            <AccessIcon aria-hidden className="h-4 w-4" />
          </span>
          <div>
            <p className="font-mono text-[10px] text-signal uppercase tracking-[.12em]">
              How this site is reached
            </p>
            <h2 className="mt-2 font-heading font-semibold text-lg">{access.title}</h2>
          </div>
        </div>
        <p className="mt-3 text-muted text-sm leading-6">{access.description}</p>
        {project.accessMode !== 'public' || recoveryKind === 'access' ? (
          <div className="mt-4">
            <ProjectCliSetup
              configured={project.apiTokenConfigured}
              authenticatedPages={project.authenticatedPages}
              latestPages={project.latestPages}
              managedAccess={project.managedAccess}
              pages={project.pages}
              plan={project.plan}
              projectId={project.id}
              receivedChecks={project.ciRuns}
              siteUrl={project.url}
            />
          </div>
        ) : null}
      </section>
      <section className="h-full border border-border bg-surface p-5 md:col-span-2 xl:col-span-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] text-muted uppercase tracking-[.12em]">
              Recommended order
            </p>
            <h2 className="mt-2 font-heading font-semibold text-lg">Next actions</h2>
          </div>
          <Badge
            className="gap-1.5 rounded-none font-mono"
            size="sm"
            variant={important > 0 ? 'high' : 'success'}
          >
            {important > 0 ? (
              <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
            ) : (
              <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />
            )}
            {important > 0
              ? `${important} priority ${important === 1 ? 'item' : 'items'}`
              : 'Up to date'}
          </Badge>
        </div>
        <ol className="mt-5 grid gap-2 sm:grid-cols-2">
          <ProjectActionStep
            complete={newFindings === 0}
            description={
              newFindings === 0
                ? 'You have reviewed everything from the latest check.'
                : `${newFindings} new ${newFindings === 1 ? 'problem needs' : 'problems need'} a look.`
            }
            title="Review new problems"
          />
          <ProjectActionStep
            complete={existingFindings === 0}
            description={
              existingFindings === 0
                ? 'No known problem is still open.'
                : `${existingFindings} known ${existingFindings === 1 ? 'problem is' : 'problems are'} still open.`
            }
            title="Work through known problems"
          />
          <ProjectActionStep
            complete={
              project.accessMode !== 'public'
                ? project.managedAccess?.status === 'verified' || project.ciRuns > 0
                : project.scheduleEnabled
            }
            description={
              project.accessMode !== 'public'
                ? project.managedAccess?.status === 'verified'
                  ? `${project.managedAccess.displayLabel} is connected for automatic checks.`
                  : project.ciRuns > 0
                    ? `${project.ciRuns} secure ${project.ciRuns === 1 ? 'check has' : 'checks have'} reached CodeRocket.`
                    : 'Connect page access once. CodeRocket will recommend the simplest available method.'
                : project.scheduleEnabled
                  ? `Automatic monitoring is active. Next check ${project.nextCheck}.`
                  : 'Turn on automatic checks so changes to the live site are not missed.'
            }
            title={
              project.accessMode !== 'public'
                ? 'Connect secure access'
                : 'Keep automatic monitoring active'
            }
          />
        </ol>
      </section>
      <section className="h-full border border-border bg-surface p-5">
        <BrainCircuit aria-hidden className="h-5 w-5 text-accent" />
        <p className="mt-4 font-mono text-[10px] text-accent uppercase tracking-[.12em]">
          Optional help on every finding
        </p>
        <h2 className="mt-2 font-heading font-semibold text-lg">From proof to a clear next step</h2>
        <p className="mt-2 text-muted text-sm leading-6">
          Open any problem and choose “Help me fix this”. Start with a simple explanation, then copy
          a client summary or a structured task for a developer or coding assistant.
        </p>
      </section>
      <section className="h-full border border-border bg-surface p-5">
        {project.accessMode !== 'public' ? (
          <LockKeyhole aria-hidden className="h-5 w-5 text-signal" />
        ) : (
          <Cloud aria-hidden className="h-5 w-5 text-signal" />
        )}
        <p className="mt-4 font-mono text-[10px] text-signal uppercase tracking-[.12em]">
          {project.accessMode !== 'public' ? 'Required for protected pages' : 'Active by default'}
        </p>
        <h2 className="mt-2 font-heading font-semibold text-lg">
          {project.accessMode !== 'public'
            ? 'Open protected pages safely'
            : 'Monitor the published website'}
        </h2>
        <p className="mt-2 text-muted text-sm leading-6">
          {project.accessMode !== 'public'
            ? `${project.pages.length - project.authenticatedPages.length} public ${project.pages.length - project.authenticatedPages.length === 1 ? 'page stays' : 'pages stay'} anonymous, while ${project.authenticatedPages.length} protected ${project.authenticatedPages.length === 1 ? 'page receives' : 'pages receive'} only the access configured for them. CodeRocket tries a guided cloud connection first and keeps the secure runner for private infrastructure.`
            : `CodeRocket checks the live pages from the cloud. Next automatic check ${project.nextCheck}. No repository setup is needed.`}
        </p>
        {project.accessMode !== 'public' ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ProjectCliSetup
              configured={project.apiTokenConfigured}
              authenticatedPages={project.authenticatedPages}
              latestPages={project.latestPages}
              managedAccess={project.managedAccess}
              pages={project.pages}
              plan={project.plan}
              projectId={project.id}
              receivedChecks={project.ciRuns}
              siteUrl={project.url}
            />
            <span className="font-mono text-[10px] text-muted uppercase tracking-[.1em]">
              {project.managedAccess?.status === 'verified' || project.ciRuns > 0
                ? 'Page access connected'
                : project.apiTokenConfigured
                  ? 'Waiting for first check'
                  : 'Not connected'}
            </span>
          </div>
        ) : null}
      </section>
      <ProjectPreviewProtectionCard />
      <section className="h-full border border-border bg-background p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck aria-hidden className="h-5 w-5 text-success" />
          <h2 className="font-heading font-semibold text-lg">What is covered</h2>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <ProjectCoverageMetric label="Pages" value={String(project.pages.length)} />
          <ProjectCoverageMetric
            label="Frequency"
            value={project.plan === 'free' ? 'Weekly' : 'Daily'}
          />
          <ProjectCoverageMetric
            label="History"
            value={
              project.plan === 'free' ? '30 days' : project.plan === 'solo' ? '90 days' : '1 year'
            }
          />
          <ProjectCoverageMetric label="Alerts" value="Important changes" />
        </dl>
      </section>

      {project.plan === 'free' ? (
        <section className="border border-accent bg-surface p-5 md:col-span-2 xl:col-span-3">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <div className="flex items-center gap-3">
                <BellRing aria-hidden className="h-5 w-5 text-accent" />
                <p className="font-mono text-accent text-xs uppercase tracking-[.12em]">
                  Personal plan
                </p>
              </div>
              <h2 className="mt-3 font-heading font-semibold text-xl">
                Check every day, not every week.
              </h2>
              <p className="mt-2 max-w-4xl text-muted text-sm leading-6">
                Get more monitored pages, 90 days of history, 100 checks started by you or CI, and
                at least 100 evidence-grounded guided resolutions each month.
              </p>
            </div>
            <CodeRocketButton asChild className="shrink-0" size="sm">
              <UpgradeLink currentPlan="free" source="daily_monitoring" targetPlan="solo">
                Check this site every day →
              </UpgradeLink>
            </CodeRocketButton>
          </div>
        </section>
      ) : null}
    </aside>
  )
}

/** Describe the active website reachability contract and its recovery state. */
function accessContent(
  project: ProjectDetail,
  recoveryKind?: ReturnType<typeof getProjectRecoveryKind>
) {
  if (recoveryKind === 'address' || recoveryKind === 'pages')
    return {
      icon: AlertTriangle,
      title:
        recoveryKind === 'address' ? 'Website address needs checking' : 'Some URLs need correcting',
      description:
        recoveryKind === 'address'
          ? 'The saved hostname could not be found. Correct the website address before running another check.'
          : 'The website is reachable, but one or more selected page addresses do not exist. Update the monitored page list before retrying.'
    }
  if (recoveryKind === 'temporary')
    return {
      icon: AlertTriangle,
      title: 'Cloud check incomplete',
      description:
        'Some pages did not return a reliable result. Retry the check first, then review the monitored URLs if the problem continues.'
    }
  if (recoveryKind === 'access')
    return {
      icon: LockKeyhole,
      title: 'Some pages need access',
      description:
        'Sign-in, a hosting protection, or a firewall blocked the public check. CodeRocket will recommend the simplest guided connection before showing developer options.'
    }
  if (project.accessMode !== 'public')
    return {
      icon: LockKeyhole,
      title:
        project.managedAccess?.status === 'verified' || project.ciRuns > 0
          ? 'Page access connected'
          : project.apiTokenConfigured
            ? 'Waiting for the first secure check'
            : 'Secure access required',
      description:
        project.managedAccess?.status === 'verified'
          ? `${project.managedAccess.displayLabel} is verified. Automatic checks can open the protected pages without changing the public-page visitor state.`
          : project.ciRuns > 0
            ? 'The secure runner sends one complete result while keeping public pages anonymous and signed-in pages authenticated.'
            : project.apiTokenConfigured
              ? 'A project key exists. Run the generated job once to confirm every public and protected page in one complete result.'
              : 'Some or all pages need controlled access. CodeRocket starts with a guided connection and never asks for your normal personal password.'
    }
  return {
    icon: Cloud,
    title: 'Public cloud check',
    description:
      'CodeRocket opens the selected public pages without signing in. Pages it cannot read are reported as incomplete.'
  }
}
