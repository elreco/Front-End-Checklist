import type { WebsiteLevel } from '@coderocket/core/website-level'
import type { DashboardProject } from '@/lib/dashboard-data'
import { WebsiteLevelBadge } from '../website-level'

const PORTFOLIO_LEVELS: WebsiteLevel[] = [
  'needs_attention',
  'bronze',
  'silver',
  'gold',
  'platinum',
  'unverified'
]

/** Summarize the absolute health levels across a user's website portfolio. */
export function DashboardLevelOverview({ projects }: { projects: DashboardProject[] }) {
  if (projects.length === 0) return null

  return (
    <section aria-labelledby="portfolio-levels-title" className="border border-border bg-surface">
      <div className="grid gap-5 border-border border-b p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="font-mono text-[10px] text-signal uppercase tracking-[.16em]">
            Website levels
          </p>
          <h2 className="mt-2 font-heading font-semibold text-xl" id="portfolio-levels-title">
            A quick view of your whole portfolio
          </h2>
          <p className="mt-2 max-w-3xl text-muted text-sm leading-6">
            Levels describe the open problems found across every selected page. They never replace
            the check result that tells you what changed.
          </p>
        </div>
        <p className="max-w-sm border border-border bg-background px-4 py-3 text-muted text-xs leading-5">
          Platinum is the highest quality level. Complete checks without a new important problem
          build a separate stability history.
        </p>
      </div>
      <div className="grid gap-px bg-border sm:grid-cols-3 xl:grid-cols-6">
        {PORTFOLIO_LEVELS.map(level => {
          const count = projects.filter(project => project.level.level === level).length
          return (
            <div className="flex items-center justify-between gap-3 bg-background p-4" key={level}>
              <WebsiteLevelBadge level={level} />
              <span className="font-heading font-semibold text-xl">{count}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
