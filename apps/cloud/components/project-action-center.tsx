import {
  AlertTriangle,
  BellRing,
  BrainCircuit,
  CheckCircle2,
  CircleDashed,
  Cloud,
  GitBranch,
  LockKeyhole,
  ShieldCheck
} from '@repo/design-system/icons'
import { Badge } from '@repo/design-system/ui/badge'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import type { ProjectDetail } from '@/lib/project-data'
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
  const access = accessContent(project)
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
        {project.accessMode === 'private' || project.latestAudit?.gate === 'inconclusive' ? (
          <div className="mt-4">
            <ProjectCliSetup configured={project.apiTokenConfigured} projectId={project.id} />
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
          <ActionStep
            complete={newFindings === 0}
            description={
              newFindings === 0
                ? 'You have reviewed everything from the latest check.'
                : `${newFindings} new ${newFindings === 1 ? 'problem needs' : 'problems need'} a look.`
            }
            title="Review new problems"
          />
          <ActionStep
            complete={existingFindings === 0}
            description={
              existingFindings === 0
                ? 'No known problem is still open.'
                : `${existingFindings} known ${existingFindings === 1 ? 'problem is' : 'problems are'} still open.`
            }
            title="Work through known problems"
          />
          <ActionStep
            complete={project.apiTokenConfigured}
            description={
              project.apiTokenConfigured
                ? `${project.ciRuns} runner ${project.ciRuns === 1 ? 'check' : 'checks'} received.`
                : project.accessMode === 'private'
                  ? 'Required: run the check from an environment that can open the private pages.'
                  : 'Optional: check a test version before it reaches the live site.'
            }
            title={
              project.accessMode === 'private' ? 'Connect the private runner' : 'Connect GitHub'
            }
          />
          <ActionStep
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
            ? 'Required for private pages'
            : 'Optional · for development teams'}
        </p>
        <h2 className="mt-2 font-heading font-semibold text-lg">
          {project.accessMode === 'private'
            ? 'Check from inside your environment'
            : 'Check before publishing'}
        </h2>
        <p className="mt-2 text-muted text-sm leading-6">
          {project.accessMode === 'private'
            ? 'The runner opens the pages from GitHub Actions or your own environment, then sends only the check result to CodeRocket.'
            : 'Connect GitHub to check a test version before it replaces the live website. A release is stopped only when a new urgent or important problem appears.'}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ProjectCliSetup configured={project.apiTokenConfigured} projectId={project.id} />
          <span className="font-mono text-[10px] text-muted uppercase tracking-[.1em]">
            {project.apiTokenConfigured ? 'GitHub access ready' : 'Not connected'}
          </span>
        </div>
      </section>

      <section className="h-full border border-border bg-background p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck aria-hidden className="h-5 w-5 text-success" />
          <h2 className="font-heading font-semibold text-lg">What is covered</h2>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <Metric label="Pages" value={String(project.pages.length)} />
          <Metric label="Frequency" value={project.plan === 'free' ? 'Weekly' : 'Daily'} />
          <Metric
            label="History"
            value={
              project.plan === 'free' ? '30 days' : project.plan === 'solo' ? '90 days' : '1 year'
            }
          />
          <Metric label="Alerts" value="Important changes" />
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
                Get more monitored pages, 90 days of history, 100 checks started by you or GitHub,
                and at least 100 evidence-grounded AI fix plans each month.
              </p>
            </div>
            <CodeRocketButton asChild className="shrink-0" size="sm">
              <Link href="/pricing">Compare plans →</Link>
            </CodeRocketButton>
          </div>
        </section>
      ) : null}
    </aside>
  )
}

function accessContent(project: ProjectDetail) {
  if (project.accessMode === 'private')
    return {
      icon: LockKeyhole,
      title: project.apiTokenConfigured ? 'Private runner connected' : 'Private runner required',
      description: project.apiTokenConfigured
        ? 'Cloud monitoring stays off. Checks are accepted only through this project’s private access key.'
        : 'These pages need private access. CodeRocket will not try to bypass the sign-in screen or store your normal account password.'
    }
  if (project.accessMode === 'protected')
    return {
      icon: ShieldCheck,
      title:
        project.latestAudit?.gate === 'inconclusive'
          ? 'Site protection blocked the check'
          : 'Protected-site access test',
      description:
        project.latestAudit?.gate === 'inconclusive'
          ? 'No healthy result was recorded. Use the runner when Cloudflare, a firewall, or an access screen keeps blocking cloud checks.'
          : 'CodeRocket checks the public pages from the cloud. If the protection blocks access, the result becomes incomplete rather than clear.'
    }
  return {
    icon: Cloud,
    title: 'Public cloud check',
    description:
      'CodeRocket opens the selected public pages without signing in. Pages it cannot read are reported as incomplete.'
  }
}

function ActionStep({
  complete,
  description,
  title
}: {
  complete: boolean
  description: string
  title: string
}) {
  const Icon = complete ? CheckCircle2 : CircleDashed
  return (
    <li className="grid grid-cols-[auto_1fr] gap-3 border border-border bg-background p-3.5">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center border ${complete ? 'border-success text-success' : 'border-signal text-signal'}`}
      >
        <Icon aria-hidden className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-sm">{title}</p>
          <span
            className={`font-mono text-[10px] uppercase tracking-[.1em] ${complete ? 'text-success' : 'text-signal'}`}
          >
            {complete ? 'Done' : 'To do'}
          </span>
        </div>
        <p className="mt-1 text-muted text-xs leading-5">{description}</p>
      </div>
    </li>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] text-muted uppercase tracking-[.1em]">{label}</dt>
      <dd className="mt-1 font-semibold text-xs">{value}</dd>
    </div>
  )
}
