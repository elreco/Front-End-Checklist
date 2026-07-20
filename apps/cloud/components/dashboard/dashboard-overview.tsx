import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Gauge,
  Globe2,
  History,
  Plus
} from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import type { DashboardActivity, DashboardData } from '@/lib/dashboard-data'
import { getPlanLabel } from '@/lib/product-language'
import { getNextPlan } from '@/lib/upgrade'
import { UpgradeLink } from '../plan-limit-upsell'
import { EmptyState } from '../product-shell'
import { DashboardLevelOverview } from './dashboard-level-overview'
import { DashboardProjectCard } from './dashboard-project-card'
import { OnboardingChecklist } from './onboarding-checklist'
/** The action-oriented workspace overview. */
export function DashboardOverview({
  data,
  displayName
}: {
  data: DashboardData
  displayName: string
}) {
  const firstName = displayName.split(' ')[0]
  const recentProjects = data.projects.slice(0, 4)
  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-5 border border-border bg-surface p-5 sm:flex-row sm:items-center sm:p-6">
        <div>
          <p className="font-mono text-[10px] text-muted uppercase tracking-[.16em]">
            {data.attentionCount > 0
              ? 'Action recommended'
              : data.setupRequiredCount > 0
                ? 'Connection needed'
                : data.incompleteCount > 0
                  ? 'Check incomplete'
                  : 'Workspace status'}
          </p>
          <h2 className="mt-2 font-heading font-semibold text-2xl sm:text-3xl">
            {data.projectCount === 0
              ? `Welcome, ${firstName}. Let’s add your first site.`
              : data.setupRequiredCount > 0
                ? `${data.setupRequiredCount} restricted ${data.setupRequiredCount === 1 ? 'site needs' : 'sites need'} secure access.`
                : data.attentionCount > 0
                  ? `${data.attentionCount} new ${data.attentionCount === 1 ? 'problem needs' : 'problems need'} a look.`
                  : data.incompleteCount > 0
                    ? `${data.incompleteCount} ${data.incompleteCount === 1 ? 'site could' : 'sites could'} not be fully checked.`
                    : `Everything looks clear, ${firstName}.`}
          </h2>
          <p className="mt-2 max-w-3xl text-muted leading-7">
            {data.projectCount === 0
              ? 'CodeRocket checks your live pages, remembers the current state, and tells you only when something important changes.'
              : data.setupRequiredCount > 0
                ? 'Restricted pages are never checked from the public cloud. Open the site to send clear setup instructions or connect an environment that can reach it.'
                : data.attentionCount > 0
                  ? 'These problems appeared after the previous complete check. Known problems stay visible, but do not create a new alert.'
                  : data.incompleteCount > 0
                    ? 'CodeRocket could not read every selected page. Open the website to see which page was blocked or unavailable.'
                    : 'No new important problems were found in the latest complete checks.'}
          </p>
        </div>
        <CodeRocketButton asChild className="shrink-0" size="lg">
          <Link href={data.projectCount === 0 ? '/onboarding' : '/sites'}>
            {data.projectCount === 0 ? <Plus aria-hidden /> : <Gauge aria-hidden />}
            {data.projectCount === 0 ? 'Add my first site' : 'View my sites'}
          </Link>
        </CodeRocketButton>
      </section>
      <OnboardingChecklist data={data} />

      <section
        aria-label="Workspace summary"
        className="grid gap-px border border-border bg-border sm:grid-cols-2 xl:grid-cols-4"
      >
        <SummaryCard
          detail={`Included in your ${getPlanLabel(data.plan)} plan.`}
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
          label="Checks used this month"
          value={`${data.checksThisMonth} / ${data.runLimit}`}
        />
        <SummaryCard
          detail="Automatic checks stay on by default."
          icon={CalendarClock}
          label="Next automatic check"
          value={data.nextCheck}
        />
      </section>

      <DashboardLevelOverview projects={data.projects} />

      <section aria-labelledby="sites-title" id="sites">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-heading font-semibold text-2xl" id="sites-title">
              Recent sites
            </h2>
            <p className="mt-1 text-muted text-sm">
              Your most recently added sites. Search and organize the full list from Sites.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CodeRocketButton asChild size="sm" variant="outline">
              <Link href="/sites">View all sites</Link>
            </CodeRocketButton>
            <CodeRocketButton asChild size="sm" variant="outline">
              <Link href="/onboarding">
                <Plus aria-hidden /> Add another site
              </Link>
            </CodeRocketButton>
          </div>
        </div>
        {data.projects.length === 0 ? (
          <EmptyState title="No sites are being monitored yet">
            <p>
              Add a website, choose the pages that matter most, and tell us whether they require
              sign-in.
            </p>
            <CodeRocketButton asChild className="mt-5" variant="link">
              <Link href="/onboarding">
                Add your first site <ArrowRight aria-hidden />
              </Link>
            </CodeRocketButton>
          </EmptyState>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {recentProjects.map(project => (
              <DashboardProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-7 xl:grid-cols-[1.35fr_.65fr]">
        <RecentActivity activity={data.activity} />
        <PlanCard data={data} />
      </div>
    </div>
  )
}

/** Render one high-level workspace metric. */
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

/** Render the latest check activity across all websites. */
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

/** Render one item in the recent check timeline. */
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
                ? `${item.blockingCount} new ${item.blockingCount === 1 ? 'problem' : 'problems'} found.`
                : 'No new problems found.'}
        </p>
      </div>
      <span className="shrink-0 text-muted text-xs">{item.happenedAt}</span>
    </li>
  )
}
/** Explain the current plan and the most relevant upgrade path. */
function PlanCard({ data }: { data: DashboardData }) {
  const paid = data.plan !== 'free'
  const minimumPlansLeft = Math.floor(data.aiCreditsRemaining / 1000)
  const nextPlan = getNextPlan(data.plan)
  return (
    <aside className="border border-border bg-surface p-5 sm:p-6">
      <p className="font-mono text-[10px] text-accent uppercase tracking-[.16em]">
        {getPlanLabel(data.plan)} plan
      </p>
      <h2 className="mt-3 font-heading font-semibold text-xl">
        {paid ? 'Your monitoring grows with you' : 'Ready for daily monitoring?'}
      </h2>
      <p className="mt-3 text-muted text-sm leading-6">
        {data.plan === 'agency'
          ? 'You have 50 sites, a full year of history, and client reports without secondary branding.'
          : data.plan === 'solo'
            ? 'Studio adds 50 monitored client sites, a year of history, and fully unbranded reports.'
            : 'Launch checks up to three websites every day and keeps 90 days of history.'}
      </p>
      <div className="mt-5 border border-border bg-background p-4">
        <p className="font-mono text-[10px] text-signal uppercase tracking-[.12em]">
          AI fix assistant included
        </p>
        <p className="mt-2 font-heading font-semibold text-lg">
          At least {minimumPlansLeft} more {minimumPlansLeft === 1 ? 'plan' : 'plans'} this month
        </p>
        <p className="mt-1 text-muted text-xs leading-5">
          Short explanations use less of your included capacity. Only completed responses count.
        </p>
      </div>
      {nextPlan ? (
        <CodeRocketButton asChild className="mt-5" fullWidth variant="outline">
          <UpgradeLink currentPlan={data.plan} source="dashboard_plan" targetPlan={nextPlan}>
            {data.plan === 'free' ? 'Get daily monitoring' : 'Grow to 50 client sites'}{' '}
            <ArrowRight aria-hidden />
          </UpgradeLink>
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
