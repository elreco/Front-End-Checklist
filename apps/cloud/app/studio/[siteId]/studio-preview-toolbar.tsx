'use client'

import type { SiteEditSelection } from '@coderocket/core/site-edit'
import {
  Check,
  ChevronDown,
  Monitor,
  MousePointerClick,
  Smartphone,
  Tablet,
  X
} from '@repo/design-system/icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@repo/design-system/ui/dropdown-menu'
import Link from 'next/link'
import type { ComponentType, SVGProps } from 'react'

export type PreviewViewport = 'desktop' | 'tablet' | 'mobile'

/** Minimal page information needed by the compact preview navigator. */
export interface StudioPageOption {
  path: string
  title: string
}

interface ViewportOption {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  value: PreviewViewport
}

const viewportOptions: ViewportOption[] = [
  { icon: Monitor, label: 'Desktop', value: 'desktop' },
  { icon: Tablet, label: 'Tablet', value: 'tablet' },
  { icon: Smartphone, label: 'Phone', value: 'mobile' }
]

/** Keep page navigation, responsive sizes, and precise selection beside the preview they affect. */
export function StudioPreviewToolbar({
  clearSelection,
  pages,
  revisionId,
  selectedPath,
  selection,
  selectionEnabled = true,
  selecting,
  setSelecting,
  setViewport,
  siteId,
  viewport
}: {
  clearSelection: () => void
  pages: StudioPageOption[]
  revisionId?: string
  selectedPath: string
  selection?: SiteEditSelection
  selectionEnabled?: boolean
  selecting: boolean
  setSelecting: (selecting: boolean) => void
  setViewport: (viewport: PreviewViewport) => void
  siteId: string
  viewport: PreviewViewport
}) {
  const currentPage = pages.find(page => page.path === selectedPath)
  return (
    <div className="relative z-20 grid h-10 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-border border-b bg-background px-2">
      <div
        aria-label="Preview size"
        className="flex min-w-0 items-center justify-self-start border border-border"
        role="group"
      >
        {viewportOptions.map(option => {
          const Icon = option.icon
          const current = viewport === option.value
          return (
            <button
              aria-label={`${option.label} preview`}
              aria-pressed={current}
              className={`grid h-7 w-8 place-items-center transition-colors focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2 ${
                current
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted hover:bg-surface-raised hover:text-foreground'
              }`}
              key={option.value}
              onClick={() => setViewport(option.value)}
              title={option.label}
              type="button"
            >
              <Icon aria-hidden className="h-3.5 w-3.5" />
            </button>
          )
        })}
      </div>

      {selecting ? (
        <p className="w-[min(18rem,42vw)] truncate text-center text-[11px] text-foreground">
          Click an element · Esc to cancel
        </p>
      ) : (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger className="group flex h-8 w-[min(16rem,36vw)] min-w-0 cursor-pointer items-center justify-center gap-1.5 justify-self-center border border-transparent px-2 text-xs outline-none transition-colors hover:border-border hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2 data-[state=open]:border-border data-[state=open]:bg-surface-raised">
            <span className="truncate font-medium">{pageLabel(currentPage)}</span>
            <ChevronDown
              aria-hidden
              className="h-3.5 w-3.5 shrink-0 text-muted transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            className="w-[min(22rem,calc(100vw-1rem))] rounded-none bg-surface p-1.5"
          >
            <div className="flex items-center justify-between gap-3 px-2 py-1.5">
              <p className="font-mono text-[9px] text-muted uppercase tracking-[.16em]">Pages</p>
              <span className="font-mono text-[9px] text-muted">{pages.length}</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {pages.map(page => {
                const current = page.path === selectedPath
                return (
                  <DropdownMenuItem
                    asChild
                    className={`min-h-9 gap-2 px-2 text-xs hover:bg-surface-raised focus:bg-surface-raised ${
                      current ? 'bg-surface-raised text-foreground' : 'text-muted'
                    }`}
                    key={page.path}
                  >
                    <Link
                      aria-current={current ? 'page' : undefined}
                      href={studioPageHref(siteId, page.path, revisionId)}
                    >
                      <Check
                        aria-hidden
                        className={`h-3.5 w-3.5 shrink-0 ${current ? 'opacity-100' : 'opacity-0'}`}
                      />
                      <span className="min-w-0 flex-1 truncate">{pageLabel(page)}</span>
                      <span className="max-w-28 shrink-0 truncate font-mono text-[10px]">
                        {page.path}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                )
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className="flex min-w-0 items-center justify-self-end">
        {selection ? (
          <button
            aria-label="Clear selected element"
            className="grid h-8 w-8 place-items-center text-muted hover:bg-surface-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2"
            onClick={clearSelection}
            title="Clear selection"
            type="button"
          >
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          aria-label={
            !selectionEnabled
              ? 'Selection is available on the latest version'
              : selecting
                ? 'Cancel page selection'
                : selection
                  ? 'Select another element on the page'
                  : 'Select an element on the page'
          }
          aria-pressed={selecting}
          disabled={!selectionEnabled}
          className={`flex h-8 items-center justify-center gap-1.5 px-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2 ${
            !selectionEnabled
              ? 'cursor-not-allowed text-foreground-subtle'
              : selecting
                ? 'bg-accent text-accent-foreground'
                : 'text-muted hover:bg-surface-raised hover:text-foreground'
          }`}
          onClick={() => setSelecting(!selecting)}
          title={
            selectionEnabled
              ? selecting
                ? 'Cancel selection'
                : 'Select on page'
              : 'Continue from this version to select and edit elements'
          }
          type="button"
        >
          <MousePointerClick aria-hidden className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">{selecting ? 'Cancel' : 'Select'}</span>
        </button>
      </div>
    </div>
  )
}

/** Use a familiar home label while preserving the captured title for every other page. */
function pageLabel(page?: StudioPageOption): string {
  if (!page || page.path === '/') return 'Homepage'
  return page.title
}

/** Preserve the selected Studio page while keeping the root URL clean. */
function studioPageHref(siteId: string, path: string, revisionId?: string): string {
  const query = new URLSearchParams()
  if (revisionId) query.set('version', revisionId)
  if (path !== '/') query.set('page', path)
  const suffix = query.toString()
  return `/studio/${siteId}${suffix ? `?${suffix}` : ''}`
}
