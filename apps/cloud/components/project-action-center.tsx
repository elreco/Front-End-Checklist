import {
  AlertTriangle,
  BellRing,
  BrainCircuit,
  CheckCircle2,
  Cloud,
  GitBranch,
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
        {project.accessMode === 'private' || recoveryKind === 'access' ? (
          <div className="mt-4">
            <ProjectCliSetup
              configured={project.apiTokenConfigured}
              pages={project.pages}
              plan={project.plan}
              projectId={project.id}
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
            complete={project.apiTokenConfigured}
            description={
              project.apiTokenConfigured
                ? `${project.ciRuns} CI ${project.ciRuns === 1 ? 'check' : 'checks'} received.`
                : project.accessMode === 'private'
                  ? 'Required: run the check from an environment that can open the restricted pages.'
                  : 'Optional: check a test version before it reaches the live site.'
            }
            title={project.accessMode === 'private' ? 'Set up the CI check' : 'Connect your CI'}
          />
          <ProjectActionStep
            complete={project.scheduleEnabled}
            description={
              project.scheduleEnabled
                ? `Automatic monitoring is active. Next check ${project.nextCheck}.`
                : 'Turn on automatic checks so changes are not missed.'
            }
            title="Keep monitoring active"
          />
        </ol>
      </section>

      <section className="h-full border border-border bg-surface p-5">
        <BrainCircuit aria-hidden className="h-5 w-5 text-accent" />
        <p className="mt-4 font-mono text-[10px] text-accent uppercase tracking-[.12em]">
          Optional help on every finding
        </p>
        <h2 className="mt-2 font-heading font-semibold text-lg">From proof to a fix plan</h2>
        <p className="mt-2 text-muted text-sm leading-6">
          Open any problem and choose “Explain &amp; plan a fix”. The assistant can write for you, a
          client, or a developer. It uses the saved evidence and official rule, then tells you how
          to verify the change.
        </p>
      </section>

      <section className="h-full border border-border bg-surface p-5">
        <GitBranch aria-hidden className="h-5 w-5 text-signal" />
        <p className="mt-4 font-mono text-[10px] text-signal uppercase tracking-[.12em]">
          {project.accessMode === 'private'
            ? 'Required for restricted pages'
            : 'Optional · for development teams'}
        </p>
        <h2 className="mt-2 font-heading font-semibold text-lg">
          {project.accessMode === 'private'
            ? 'Check from your CI environment'
            : 'Check before publishing'}
        </h2>
        <p className="mt-2 text-muted text-sm leading-6">
          {project.accessMode === 'private'
            ? 'The CI job opens the pages from GitHub, GitLab, Bitbucket, or your own environment, then sends only the check result to CodeRocket.'
            : 'Connect your CI platform to check a test version before it replaces the live website. A release is stopped only when a new urgent or important problem appears.'}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ProjectCliSetup
            configured={project.apiTokenConfigured}
            pages={project.pages}
            plan={project.plan}
            projectId={project.id}
            siteUrl={project.url}
          />
          <span className="font-mono text-[10px] text-muted uppercase tracking-[.1em]">
            {project.apiTokenConfigured ? 'CI access ready' : 'Not connected'}
          </span>
        </div>
      </section>

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
                at least 100 evidence-grounded AI fix plans each month.
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
      title: 'Protected pages need CI access',
      description:
        'Sign-in, a firewall, or a challenge blocked the cloud check. Run it from an environment that can already open these pages.'
    }
  if (project.accessMode === 'private')
    return {
      icon: LockKeyhole,
      title: project.apiTokenConfigured ? 'CI check connected' : 'CI check required',
      description: project.apiTokenConfigured
        ? 'Cloud monitoring stays off. Checks are accepted through this project’s CI access key.'
        : 'These pages need private access. CodeRocket will not try to bypass the sign-in screen or store your normal account password.'
    }
  if (project.accessMode === 'protected')
    return {
      icon: ShieldCheck,
      title: 'Cloud check',
      description:
        'CodeRocket checks these pages from the cloud. If it cannot confirm the expected HTML, the result becomes incomplete rather than clear.'
    }
  return {
    icon: Cloud,
    title: 'Public cloud check',
    description:
      'CodeRocket opens the selected public pages without signing in. Pages it cannot read are reported as incomplete.'
  }
}
