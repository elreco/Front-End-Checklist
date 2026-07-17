import { ExternalLink } from '@repo/design-system/icons'
import Link from 'next/link'
import type { DashboardProject } from '@/lib/dashboard-data'
import { getAccessModeLabel } from '@/lib/product-language'
import { ProjectStatusBadge } from './dashboard/dashboard-project-card'

/** Render one compact, fully clickable monitored-site summary. */
export function SiteDirectoryRow({ project }: { project: DashboardProject }) {
  return (
    <li className="cr-card-link relative grid gap-4 p-5 transition-colors hover:bg-surface-raised sm:p-6 lg:grid-cols-[minmax(260px,1fr)_160px_100px_110px_150px] lg:items-center">
      <div className="min-w-0">
        <h3 className="truncate font-heading font-semibold text-lg">
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
        <p className="mt-2 font-mono text-[9px] text-signal uppercase tracking-[.08em] lg:hidden">
          {getAccessModeLabel(project.accessMode)}
        </p>
      </div>
      <div className="relative z-10">
        <span className="mb-2 block font-mono text-[9px] text-muted uppercase tracking-[.08em] lg:hidden">
          Status
        </span>
        <ProjectStatusBadge project={project} />
      </div>
      <DirectoryFact
        label="Pages"
        value={`${project.checkedPageCount}/${project.requestedPageCount}`}
      />
      <DirectoryFact
        label="New"
        tone={project.blockingCount > 0 ? 'danger' : undefined}
        value={String(project.blockingCount)}
      />
      <DirectoryFact
        label="Last checked"
        value={project.isChecking ? 'Checking…' : project.lastRun}
      />
    </li>
  )
}

/** Render one small fact in a directory row. */
function DirectoryFact({ label, tone, value }: { label: string; tone?: 'danger'; value: string }) {
  return (
    <div>
      <span className="mb-1 block font-mono text-[9px] text-muted uppercase tracking-[.08em] lg:hidden">
        {label}
      </span>
      <span className={`font-semibold text-sm ${tone === 'danger' ? 'text-danger' : ''}`}>
        {value}
      </span>
    </div>
  )
}
