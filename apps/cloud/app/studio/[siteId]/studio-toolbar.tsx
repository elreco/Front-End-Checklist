import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  History,
  Link2
} from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { DropdownMenuItem } from '@repo/design-system/ui/dropdown-menu'
import Link from 'next/link'
import { countConnectionActions } from '@/lib/builder-connections'
import type { BuilderRevisionSummary, BuilderSiteDetail } from '@/lib/builder-data'
import { StudioConnectionsPanel } from './studio-connections-panel'
import { ToolbarMenu } from './studio-toolbar-menu'
import { ToolbarPopover } from './studio-toolbar-popover'
import { studioVersionHref } from './studio-version-navigation'

/** Keep project navigation, versions, and connections contextual around the prompt workspace. */
export function StudioToolbar({
  openConnections = false,
  selectedPath,
  site
}: {
  openConnections?: boolean
  selectedPath: string
  site: BuilderSiteDetail
}) {
  const connectionActions = countConnectionActions(site.connections)
  const viewedRevision = site.viewedRevision ?? site.revisions[0]
  const orderedRevisions = [...site.revisions].sort(
    (left, right) => left.revisionNumber - right.revisionNumber
  )
  const viewedIndex = orderedRevisions.findIndex(revision => revision.id === viewedRevision?.id)
  const olderRevision = viewedIndex > 0 ? orderedRevisions[viewedIndex - 1] : undefined
  const newerRevision =
    viewedIndex >= 0 && viewedIndex < orderedRevisions.length - 1
      ? orderedRevisions[viewedIndex + 1]
      : undefined
  const viewingLatest = viewedRevision?.id === site.currentRevisionId
  return (
    <div className="relative z-50 flex h-10 shrink-0 items-center gap-1 border-border border-b bg-background px-1.5 sm:px-2">
      <CodeRocketButton
        asChild
        aria-label="Back to my websites"
        className="h-8 w-8"
        size="icon"
        variant="ghost"
      >
        <Link href="/websites">
          <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
        </Link>
      </CodeRocketButton>
      <VersionArrow
        direction="older"
        revision={olderRevision}
        selectedPath={selectedPath}
        site={site}
      />
      <ToolbarMenu
        icon={<History aria-hidden className="h-4 w-4" />}
        label={
          viewedRevision
            ? `V${viewedRevision.revisionNumber} · ${viewedRevision.title}`
            : 'Versions'
        }
      >
        <div className="w-[min(24rem,calc(100vw-1rem))] p-2">
          <div className="px-2 py-2">
            <p className="font-semibold text-sm">Versions</p>
            <p className="mt-1 text-muted text-xs">
              Open any version to compare it. Your newer work stays safe.
            </p>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {site.revisions.map(revision => {
              const selected = revision.id === viewedRevision?.id
              const latest = revision.id === site.currentRevisionId
              return (
                <DropdownMenuItem
                  asChild
                  className={`min-h-14 gap-2 border-border border-t px-2 py-2 hover:bg-surface-raised focus:bg-surface-raised ${
                    selected ? 'bg-surface-raised text-foreground' : 'text-muted'
                  }`}
                  key={revision.id}
                >
                  <Link
                    aria-current={selected ? 'page' : undefined}
                    href={studioVersionHref(
                      site.id,
                      revision,
                      selectedPath,
                      site.currentRevisionId
                    )}
                  >
                    <Check
                      aria-hidden
                      className={`h-3.5 w-3.5 shrink-0 ${selected ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-sm">{revision.title}</p>
                      <p className="mt-0.5 truncate text-xs">
                        V{revision.revisionNumber} {latest ? '· Latest' : ''} ·{' '}
                        {formatRevisionDate(revision.createdAt)}
                      </p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </div>
        </div>
      </ToolbarMenu>
      <VersionArrow
        direction="newer"
        revision={newerRevision}
        selectedPath={selectedPath}
        site={site}
      />
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {viewingLatest ? (
          <ToolbarPopover
            align="right"
            badge={connectionActions || undefined}
            icon={<Link2 aria-hidden className="h-4 w-4" />}
            label="Connect"
            open={openConnections}
          >
            <div className="w-[min(25rem,calc(100vw-1rem))]">
              <div className="border-border border-b p-4">
                <p className="font-semibold text-sm">Add a service</p>
                <p className="mt-1 text-muted text-xs leading-5">
                  Only connect something when the website needs it.
                </p>
              </div>
              <StudioConnectionsPanel compact site={site} />
            </div>
          </ToolbarPopover>
        ) : (
          <span className="hidden border border-border px-2 py-1 font-mono text-[9px] text-muted uppercase tracking-[.12em] sm:inline-flex">
            Earlier version
          </span>
        )}
        <CodeRocketButton
          asChild
          aria-label="Open source website"
          className="hidden h-8 w-8 sm:inline-flex"
          size="icon"
          variant="ghost"
        >
          <a href={site.sourceUrl} rel="noreferrer" target="_blank">
            <ExternalLink aria-hidden />
          </a>
        </CodeRocketButton>
      </div>
    </div>
  )
}

/** Move one step through the immutable version timeline without changing the website. */
function VersionArrow({
  direction,
  revision,
  selectedPath,
  site
}: {
  direction: 'newer' | 'older'
  revision?: BuilderRevisionSummary
  selectedPath: string
  site: BuilderSiteDetail
}) {
  const Icon = direction === 'older' ? ChevronLeft : ChevronRight
  const label = direction === 'older' ? 'View older version' : 'View newer version'
  if (!revision)
    return (
      <span aria-hidden="true" className="grid h-8 w-8 place-items-center text-foreground-subtle">
        <Icon className="h-3.5 w-3.5" />
      </span>
    )
  return (
    <CodeRocketButton
      asChild
      aria-label={`${label}: ${revision.title}`}
      className="h-8 w-8"
      size="icon"
      variant="ghost"
    >
      <Link href={studioVersionHref(site.id, revision, selectedPath, site.currentRevisionId)}>
        <Icon aria-hidden className="h-3.5 w-3.5" />
      </Link>
    </CodeRocketButton>
  )
}

/** Format revision timestamps for quick scanning in the owner's current locale. */
function formatRevisionDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}
