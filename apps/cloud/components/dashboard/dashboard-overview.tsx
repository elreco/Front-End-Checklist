import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Gauge,
  Globe2,
  History,
  Plus
} from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import type { DashboardActivity, DashboardData, DashboardProject } from '@/lib/dashboard-data'
import { EmptyState, GateBadge } from '../product-shell'
import { OnboardingChecklist } from './onboarding-checklist'

/** The action-oriented workspace overview. */
export function DashboardOverview({
  audience,
  data,
  displayName
}: {
  audience: 'site_owner' | 'freelancer' | 'agency'
  data: DashboardData
  displayName: string
}) {
  const firstName = displayName.split(' ')[0]
  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-5 border border-border bg-surface p-5 sm:flex-row sm:items-center sm:p-6">
        <div>
          <p className="font-mono text-[10px] text-muted uppercase tracking-[.16em]">
            {data.attentionCount > 0
              ? 'Action recommended'
              : data.incompleteCount > 0
                ? 'Check incomplete'
                : 'Workspace status'}
          </p>
          <h2 className="mt-2 font-heading font-semibold text-2xl sm:text-3xl">
            {data.projectCount === 0
              ? `Welcome, ${firstName}. Let’s add your first site.`
              : data.attentionCount > 0
                ? `${data.attentionCount} important ${data.attentionCount === 1 ? 'change needs' : 'changes need'} a look.`
                : data.incompleteCount > 0
                  ? `${data.incompleteCount} ${data.incompleteCount === 1 ? 'site could' : 'sites could'} not be fully checked.`
                  : `Everything looks clear, ${firstName}.`}
          </h2>
          <p className="mt-2 max-w-3xl text-muted leading-7">
            {data.projectCount === 0
              ? 'CodeRocket checks your live pages, remembers the current state, and tells you only when something important changes.'
              : data.attentionCount > 0
                ? 'These are new high-priority problems—not the long list of issues your site may already have had.'
                : data.incompleteCount > 0
                  ? 'CodeRocket did not receive readable HTML for every requested page. Open the site to see which page was blocked or unavailable.'
                  : 'No new high-priority problems were found in the latest completed checks.'}
          </p>
        </div>
        <CodeRocketButton asChild className="shrink-0" size="lg">
          <Link href={data.projectCount === 0 ? '/onboarding' : '#sites'}>
            {data.projectCount === 0 ? <Plus aria-hidden /> : <Gauge aria-hidden />}
            {data.projectCount === 0 ? 'Add my first site' : 'View my sites'}
          </Link>
        </CodeRocketButton>
      </section>

      <OnboardingChecklist data={data} />

      <section
        aria-label="Workspace summary"
        className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-4"
      >
        <SummaryCard
          detail={`Your ${data.plan} plan allows ${data.projectLimit}.`}
          icon={Globe2}
          label="Sites monitored"
          value={`${data.projectCount} / ${data.projectLimit}`}
        />
        <SummaryCard
          detail="Across all active sites."
          icon={Gauge}
          label="Pages watched"
          value={String(data.pageCount)}
        />
        <SummaryCard
          detail={`${data.runLimit} included in your plan.`}
          icon={History}
          label="Checks started this month"
          value={`${data.checksThisMonth} / ${data.runLimit}`}
        />
        <SummaryCard
          detail="Automatic checks stay on by default."
          icon={CalendarClock}
          label="Next automatic check"
          value={data.nextCheck}
        />
      </section>

      <section aria-labelledby="sites-title" id="sites">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-heading font-semibold text-2xl" id="sites-title">
              Your sites
            </h2>
            <p className="mt-1 text-muted text-sm">
              Open a site to understand what changed and what to do next.
            </p>
          </div>
          <CodeRocketButton asChild size="sm" variant="outline">
            <Link href="/onboarding">
              <Plus aria-hidden /> Add another site
            </Link>
          </CodeRocketButton>
        </div>
        {data.projects.length === 0 ? (
          <EmptyState title="No sites are being monitored yet">
            <p>Add a public website and choose up to five important pages on the Free plan.</p>
            <CodeRocketButton asChild className="mt-5" variant="link">
              <Link href="/onboarding">
                Add your first site <ArrowRight aria-hidden />
              </Link>
            </CodeRocketButton>
          </EmptyState>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {data.projects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-7 xl:grid-cols-[1.35fr_.65fr]">
        <RecentActivity activity={data.activity} />
        <PlanCard audience={audience} data={data} />
      </div>
    </div>
  )
}

function SummaryCard({
  detail,
  icon: Icon,
  label,
  value
}: {
  detail: string
  icon: typeof Globe2
  label: string
  value: string
}) {
  return (
    <article className="bg-surface p-5 sm:p-6">
      <div className="flex items-center gap-2 text-muted text-sm">
        <Icon aria-hidden className="h-4 w-4 text-signal" /> {label}
      </div>
      <p className="mt-5 font-heading font-semibold text-2xl">{value}</p>
      <p className="mt-1 text-muted text-xs leading-5">{detail}</p>
    </article>
  )
}

function ProjectCard({ project }: { project: DashboardProject }) {
  return (
    <article className="relative border border-border bg-surface p-5 transition-colors hover:bg-surface-raised sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate font-heading font-semibold text-xl">
            <Link
              className="after:absolute after:inset-0 after:content-['']"
              href={`/projects/${project.id}`}
            >
              {project.name}
            </Link>
          </h3>
          <a
            className="relative z-10 mt-1 inline-flex max-w-full items-center gap-1 truncate text-muted text-xs hover:text-signal"
            href={project.url}
            rel="noreferrer"
            target="_blank"
          >
            <span className="truncate">{project.url}</span>
            <ExternalLink aria-hidden className="h-3 w-3 shrink-0" />
          </a>
        </div>
        <GateBadge status={project.gate} />
      </div>
      <div className="mt-6 grid grid-cols-3 gap-px bg-border">
        <ProjectFact
          label="Pages checked"
          value={`${project.checkedPageCount} / ${project.requestedPageCount}`}
          tone={project.checkedPageCount < project.requestedPageCount ? 'danger' : undefined}
        />
        <ProjectFact
          label="New important"
          value={String(project.blockingCount)}
          tone={project.blockingCount > 0 ? 'danger' : undefined}
        />
        <ProjectFact
          label="Last checked"
          value={project.isChecking ? 'Checking…' : project.lastRun}
        />
      </div>
      <p className="mt-4 text-muted text-xs">Next check {project.nextCheck}</p>
    </article>
  )
}

function ProjectFact({ label, tone, value }: { label: string; tone?: 'danger'; value: string }) {
  return (
    <div className="bg-background p-3">
      <p className="text-[10px] text-muted uppercase tracking-[.08em]">{label}</p>
      <p
        className={`mt-1 truncate font-semibold text-sm ${tone === 'danger' ? 'text-danger' : ''}`}
      >
        {value}
      </p>
    </div>
  )
}

function RecentActivity({ activity }: { activity: DashboardActivity[] }) {
  return (
    <section aria-labelledby="activity-title" className="border border-border bg-surface">
      <div className="flex items-center justify-between border-border border-b p-5">
        <div>
          <h2 className="font-heading font-semibold text-xl" id="activity-title">
            Recent checks
          </h2>
          <p className="mt-1 text-muted text-xs">A simple timeline of what CodeRocket checked.</p>
        </div>
        <Link className="font-mono text-accent text-xs hover:text-signal" href="/audits">
          View all
        </Link>
      </div>
      {activity.length === 0 ? (
        <p className="p-5 text-muted text-sm">Your first completed check will appear here.</p>
      ) : (
        <ul className="divide-y divide-border">
          {activity.map(item => (
            <ActivityItem item={item} key={item.id} />
          ))}
        </ul>
      )}
    </section>
  )
}

function ActivityItem({ item }: { item: DashboardActivity }) {
  const clear = item.gate === 'passed' || item.gate === 'needs_baseline'
  return (
    <li className="flex items-start gap-3 p-5">
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border ${clear ? 'border-success text-success' : 'border-danger text-danger'}`}
      >
        {clear ? (
          <CheckCircle2 aria-hidden className="h-4 w-4" />
        ) : (
          <AlertTriangle aria-hidden className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <Link className="font-semibold hover:text-signal" href={`/projects/${item.projectId}`}>
          {item.projectName}
        </Link>
        <p className="mt-1 text-muted text-sm">
          {item.status === 'failed'
            ? 'The check could not finish.'
            : item.gate === 'inconclusive'
              ? 'Some pages could not be checked. No healthy result was recorded.'
              : item.blockingCount > 0
                ? `${item.blockingCount} new important ${item.blockingCount === 1 ? 'problem' : 'problems'} found.`
                : 'No new important problems found.'}
        </p>
      </div>
      <span className="shrink-0 text-muted text-xs">{item.happenedAt}</span>
    </li>
  )
}

function PlanCard({
  audience,
  data
}: {
  audience: 'site_owner' | 'freelancer' | 'agency'
  data: DashboardData
}) {
  const paid = data.plan !== 'free'
  return (
    <aside className="border border-border bg-surface p-5 sm:p-6">
      <p className="font-mono text-[10px] text-accent uppercase tracking-[.16em]">
        {data.plan} plan
      </p>
      <h2 className="mt-3 font-heading font-semibold text-xl">
        {paid ? 'Your monitoring grows with you' : 'Ready for daily monitoring?'}
      </h2>
      <p className="mt-3 text-muted text-sm leading-6">
        {data.plan === 'agency'
          ? 'You have 50 sites, a full year of history, and client reports without secondary branding.'
          : data.plan === 'solo'
            ? 'Agency adds 50 client sites, a year of history, and fully unbranded reports.'
            : audience === 'site_owner'
              ? 'Personal checks up to three websites every day and keeps 90 days of history for €12/month.'
              : 'Personal gives freelancers three daily-monitored websites; Agency scales to a 50-site client portfolio.'}
      </p>
      {data.plan !== 'agency' ? (
        <CodeRocketButton asChild className="mt-5" fullWidth variant="outline">
          <Link href="/pricing">
            Compare plans <ArrowRight aria-hidden />
          </Link>
        </CodeRocketButton>
      ) : (
        <Link
          className="mt-5 inline-flex font-mono text-accent text-xs hover:text-signal"
          href="/settings/billing"
        >
          Manage billing
        </Link>
      )}
    </aside>
  )
}
