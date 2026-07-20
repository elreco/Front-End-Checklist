import { Database, Files, Link2, MessageSquareText } from '@repo/design-system/icons'
import Link from 'next/link'
import type { BuilderSiteDetail } from '@/lib/builder-data'
import { StudioBuildPanel } from './studio-build-panel'
import { StudioConnectionsPanel } from './studio-connections-panel'
import { StudioDataPanel } from './studio-data-panel'

export type StudioPanel = 'build' | 'pages' | 'data' | 'connections'

const panels = [
  { id: 'build', label: 'Build', icon: MessageSquareText },
  { id: 'pages', label: 'Pages', icon: Files },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'connections', label: 'Connect', icon: Link2 }
] as const

/** Group full-stack capabilities by business outcome while keeping conversation as the default. */
export function StudioWorkspacePanel({
  panel,
  selectedPath,
  site
}: {
  panel: StudioPanel
  selectedPath: string
  site: BuilderSiteDetail
}) {
  return (
    <section className="min-w-0 self-start border border-border bg-surface xl:sticky xl:top-24">
      <nav aria-label="Website studio tools" className="grid grid-cols-4 border-border border-b">
        {panels.map(item => {
          const Icon = item.icon
          const current = item.id === panel
          const query = new URLSearchParams()
          if (item.id !== 'build') query.set('panel', item.id)
          if (selectedPath !== '/') query.set('page', selectedPath)
          return (
            <Link
              aria-current={current ? 'page' : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 border-r text-[10px] last:border-r-0 ${
                current
                  ? 'bg-surface-raised text-foreground'
                  : 'text-muted hover:bg-surface-raised hover:text-foreground'
              }`}
              href={`/studio/${site.id}${query.size ? `?${query.toString()}` : ''}`}
              key={item.id}
            >
              <Icon aria-hidden className={current ? 'h-4 w-4 text-signal' : 'h-4 w-4'} />
              {item.label}
            </Link>
          )
        })}
      </nav>
      {panel === 'build' ? (
        <StudioBuildPanel selectedPath={selectedPath} site={site} />
      ) : panel === 'pages' ? (
        <StudioPagesPanel selectedPath={selectedPath} site={site} />
      ) : panel === 'data' ? (
        <StudioDataPanel site={site} />
      ) : (
        <StudioConnectionsPanel site={site} />
      )}
    </section>
  )
}

function StudioPagesPanel({
  selectedPath,
  site
}: {
  selectedPath: string
  site: BuilderSiteDetail
}) {
  const pages = site.document?.pages ?? []
  return (
    <div>
      <div className="border-border border-b p-4">
        <p className="font-mono text-signal text-xs uppercase tracking-[.16em]">Pages</p>
        <h2 className="mt-1 font-heading font-semibold text-xl">A focused first version</h2>
        <p className="mt-2 text-muted text-sm leading-6">
          Repeated product or article URLs become structured data. Only useful page types stay here.
        </p>
      </div>
      <div className="space-y-2 p-4">
        {pages.map(page => {
          const query = new URLSearchParams()
          if (page.path !== '/') query.set('page', page.path)
          query.set('panel', 'pages')
          return (
            <Link
              aria-current={page.path === selectedPath ? 'page' : undefined}
              className={`block border p-3 ${
                page.path === selectedPath
                  ? 'border-signal bg-surface-raised'
                  : 'border-border hover:bg-surface-raised'
              }`}
              href={`/studio/${site.id}?${query.toString()}`}
              key={page.path}
            >
              <p className="font-semibold text-sm">{page.path === '/' ? 'Home' : page.title}</p>
              <p className="mt-1 truncate font-mono text-muted text-xs">{page.path}</p>
            </Link>
          )
        })}
        <p className="border border-border border-dashed p-3 text-muted text-xs leading-5">
          Need another page? Ask for it in Build. CodeRocket will show its 6-credit cost before
          starting.
        </p>
      </div>
    </div>
  )
}
