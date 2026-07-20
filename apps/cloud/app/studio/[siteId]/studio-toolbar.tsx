import {
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  History,
  Link2,
  RotateCcw
} from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { countConnectionActions } from '@/lib/builder-connections'
import type { BuilderSiteDetail } from '@/lib/builder-data'
import { restoreBuilderRevision } from './actions'
import { StudioConnectionsPanel } from './studio-connections-panel'

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
      <ToolbarMenu icon={<History aria-hidden className="h-4 w-4" />} label="Versions">
        <div className="w-[min(22rem,calc(100vw-1rem))] p-2">
          <div className="px-2 py-2">
            <p className="font-semibold text-sm">Version history</p>
            <p className="mt-1 text-muted text-xs">Every successful prompt stays recoverable.</p>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {site.revisions.map(revision => {
              const current = revision.revisionNumber === site.revisionNumber
              return (
                <div
                  className="flex items-center justify-between gap-3 border-border border-t px-2 py-2"
                  key={revision.id}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">
                      Version {revision.revisionNumber} {current ? '· Current' : ''}
                    </p>
                    <p className="mt-0.5 text-muted text-xs">
                      {formatRevisionDate(revision.createdAt)}
                    </p>
                  </div>
                  {current ? null : (
                    <form action={restoreBuilderRevision}>
                      <input name="siteId" type="hidden" value={site.id} />
                      <input name="revisionId" type="hidden" value={revision.id} />
                      <input name="pagePath" type="hidden" value={selectedPath} />
                      <CodeRocketButton size="sm" type="submit" variant="ghost">
                        <RotateCcw aria-hidden /> Restore
                      </CodeRocketButton>
                    </form>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </ToolbarMenu>
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <ToolbarMenu
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
        </ToolbarMenu>
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

/** Anchor one compact contextual menu to the studio toolbar. */
function ToolbarMenu({
  align = 'left',
  badge,
  children,
  icon,
  label,
  open = false
}: {
  align?: 'left' | 'right'
  badge?: number
  children: ReactNode
  icon: ReactNode
  label: string
  open?: boolean
}) {
  return (
    <details className="group relative" open={open}>
      <summary className="flex h-8 cursor-pointer list-none items-center gap-1.5 border border-transparent px-2 text-muted text-xs hover:border-border hover:bg-surface-raised hover:text-foreground group-open:border-border group-open:bg-surface-raised group-open:text-foreground [&::-webkit-details-marker]:hidden">
        {icon}
        <span className="hidden max-w-36 truncate sm:inline">{label}</span>
        {badge ? (
          <span className="min-w-4 bg-warning px-1 text-center font-mono text-[9px] text-warning-foreground">
            {badge}
          </span>
        ) : null}
        <ChevronDown
          aria-hidden
          className="h-3.5 w-3.5 transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div
        className={`absolute top-[calc(100%+0.35rem)] z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border border-border bg-surface shadow-lg ${
          align === 'right' ? 'right-0' : 'left-0'
        }`}
      >
        {children}
      </div>
    </details>
  )
}

/** Format revision timestamps for quick scanning in the owner's current locale. */
function formatRevisionDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}
