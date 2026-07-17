import { ExternalLink } from '@repo/design-system/icons'
import Link from 'next/link'
import type { DashboardProject } from '@/lib/dashboard-data'
import { getAccessModeLabel } from '@/lib/product-language'
import { SiteVisual } from '../site-visual'
import { WebsiteLevelBadge } from '../website-level'

/** Render one monitored website with its latest check summary. */
export function DashboardProjectCard({ project }: { project: DashboardProject }) {
  return (
    <article className="cr-card-link relative overflow-hidden border border-border bg-surface hover:border-accent hover:bg-surface-raised">
      <SiteVisual imageUrl={project.socialImageUrl} name={project.name} size="card" />
      <div className="p-5 sm:p-6">
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
            <p className="mt-2 font-mono text-[10px] text-signal uppercase tracking-[.08em]">
              {getAccessModeLabel(project.accessMode)}
            </p>
          </div>
          <ProjectStatusBadge project={project} />
        </div>
        <div className="mt-6 grid grid-cols-3 gap-px border border-border bg-border">
          <ProjectFact
            label="Pages checked"
            value={`${project.checkedPageCount} / ${project.requestedPageCount}`}
            tone={
              project.hasCompletedCheck && project.checkedPageCount < project.requestedPageCount
                ? 'danger'
                : undefined
            }
          />
          <ProjectFact
            label="New problems"
            value={String(project.blockingCount)}
            tone={project.blockingCount > 0 ? 'danger' : undefined}
          />
          <ProjectFact
            label="Last checked"
            value={project.isChecking ? 'Checking…' : project.lastRun}
          />
        </div>
        <p className="mt-4 text-muted text-xs">
          {project.accessMode === 'private' && !project.hasCompletedCheck
            ? 'Connect secure access to start the first result.'
            : `Next check ${project.nextCheck}`}
        </p>
      </div>
    </article>
  )
}

/** Show whether a website is ready, waiting for setup, or needs attention. */
export function ProjectStatusBadge({ project }: { project: DashboardProject }) {
  if (!project.hasCompletedCheck)
    return (
      <span className="inline-flex shrink-0 border border-accent bg-accent/10 px-2.5 py-1 font-mono font-semibold text-[10px] text-accent uppercase tracking-[.08em]">
        {project.accessMode === 'private' ? 'Secure access needed' : 'First check pending'}
      </span>
    )
  return <WebsiteLevelBadge level={project.level.level} />
}

/** Render a compact metric inside a monitored website card. */
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
