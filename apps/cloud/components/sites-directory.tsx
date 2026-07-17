'use client'

import { Plus, Search } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketInput, CodeRocketSelect } from '@repo/design-system/ui/coderocket-field'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { DashboardProject } from '@/lib/dashboard-data'
import {
  getVisibleSites,
  type SiteDirectoryAccess,
  type SiteDirectorySort,
  type SiteDirectoryStatus
} from '@/lib/site-directory'
import { EmptyState } from './product-ui'
import { SiteDirectoryRow } from './site-directory-row'

const PAGE_SIZE = 12

const statusOptions: Array<{ label: string; value: SiteDirectoryStatus }> = [
  { label: 'All statuses', value: 'all' },
  { label: 'Needs attention', value: 'attention' },
  { label: 'Check incomplete', value: 'incomplete' },
  { label: 'Checking now', value: 'checking' },
  { label: 'Setup needed', value: 'setup' },
  { label: 'No new problems', value: 'clear' }
]

const accessOptions: Array<{ label: string; value: SiteDirectoryAccess }> = [
  { label: 'All access methods', value: 'all' },
  { label: 'Public cloud checks', value: 'public' },
  { label: 'Restricted or private', value: 'restricted' }
]

const sortOptions: Array<{ label: string; value: SiteDirectorySort }> = [
  { label: 'Recently added', value: 'recent' },
  { label: 'Name A–Z', value: 'name' },
  { label: 'Most new problems', value: 'new-problems' },
  { label: 'Most pages', value: 'pages' }
]

/** Search and organize a large monitored-site portfolio. */
export function SitesDirectory({ projects }: { projects: DashboardProject[] }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<SiteDirectoryStatus>('all')
  const [access, setAccess] = useState<SiteDirectoryAccess>('all')
  const [sort, setSort] = useState<SiteDirectorySort>('recent')
  const [page, setPage] = useState(1)
  const visibleSites = useMemo(
    () => getVisibleSites(projects, { access, query, sort, status }),
    [access, projects, query, sort, status]
  )
  const pageCount = Math.max(1, Math.ceil(visibleSites.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const shownSites = visibleSites.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  /** Reset pagination whenever a directory control changes. */
  function updateFilter<T>(setter: (value: T) => void, value: T) {
    setter(value)
    setPage(1)
  }

  /** Restore the complete site list and its default ordering. */
  function clearFilters() {
    setQuery('')
    setStatus('all')
    setAccess('all')
    setSort('recent')
    setPage(1)
  }

  if (projects.length === 0)
    return (
      <EmptyState title="No sites are being monitored yet">
        <p>Add your first website and choose the pages that matter most.</p>
        <CodeRocketButton asChild className="mt-5" variant="link">
          <Link href="/onboarding">
            Add your first site <Plus aria-hidden />
          </Link>
        </CodeRocketButton>
      </EmptyState>
    )

  return (
    <section aria-labelledby="sites-directory-title" className="border border-border bg-surface">
      <div className="flex flex-col justify-between gap-4 border-border border-b p-5 sm:flex-row sm:items-center sm:p-6">
        <div>
          <p className="font-mono text-[10px] text-signal uppercase tracking-[.14em]">
            Website portfolio
          </p>
          <h2 className="mt-2 font-heading font-semibold text-2xl" id="sites-directory-title">
            Find any monitored site
          </h2>
          <p className="mt-1 text-muted text-sm">
            Search by name or address, then narrow the list by health or access method.
          </p>
        </div>
        <CodeRocketButton asChild className="shrink-0" size="sm">
          <Link href="/onboarding">
            <Plus aria-hidden /> Add a site
          </Link>
        </CodeRocketButton>
      </div>

      <div className="grid gap-4 border-border border-b bg-background p-5 sm:p-6 lg:grid-cols-[minmax(240px,1fr)_210px_210px_190px]">
        <label
          className="block font-mono text-[10px] text-muted uppercase tracking-[.1em]"
          htmlFor="site-directory-search"
        >
          Search sites
          <span className="relative mt-2 block">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
            />
            <CodeRocketInput
              aria-label="Search sites by name or address"
              className="mt-0 min-h-11 pl-10"
              id="site-directory-search"
              onChange={event => updateFilter(setQuery, event.target.value)}
              placeholder="Name or website address"
              type="search"
              value={query}
            />
          </span>
        </label>
        <DirectorySelect
          id="site-directory-health"
          label="Health"
          onChange={value => updateFilter(setStatus, value)}
          options={statusOptions}
          value={status}
        />
        <DirectorySelect
          id="site-directory-access"
          label="Access"
          onChange={value => updateFilter(setAccess, value)}
          options={accessOptions}
          value={access}
        />
        <DirectorySelect
          id="site-directory-sort"
          label="Sort by"
          onChange={value => updateFilter(setSort, value)}
          options={sortOptions}
          value={sort}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-border border-b px-5 py-3 sm:px-6">
        <p aria-live="polite" className="text-muted text-xs">
          Showing <span className="font-semibold text-foreground">{visibleSites.length}</span> of{' '}
          {projects.length} {projects.length === 1 ? 'site' : 'sites'}
        </p>
        {query || status !== 'all' || access !== 'all' || sort !== 'recent' ? (
          <CodeRocketButton onClick={clearFilters} size="sm" type="button" variant="ghost">
            Clear filters
          </CodeRocketButton>
        ) : null}
      </div>

      {shownSites.length === 0 ? (
        <div className="px-5 py-14 text-center sm:px-6">
          <Search aria-hidden className="mx-auto h-7 w-7 text-signal" />
          <h3 className="mt-4 font-heading font-semibold text-xl">No matching site</h3>
          <p className="mt-2 text-muted text-sm">Try another search or remove a filter.</p>
          <CodeRocketButton className="mt-5" onClick={clearFilters} type="button" variant="outline">
            Show all sites
          </CodeRocketButton>
        </div>
      ) : (
        <>
          <div className="hidden grid-cols-[minmax(260px,1fr)_160px_100px_110px_150px] gap-4 border-border border-b bg-background px-6 py-3 font-mono text-[10px] text-muted uppercase tracking-[.1em] lg:grid">
            <span>Website</span>
            <span>Status</span>
            <span>Pages</span>
            <span>New</span>
            <span>Last checked</span>
          </div>
          <ul className="divide-y divide-border">
            {shownSites.map(project => (
              <SiteDirectoryRow key={project.id} project={project} />
            ))}
          </ul>
        </>
      )}

      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-4 border-border border-t bg-background px-5 py-4 sm:px-6">
          <p className="font-mono text-[10px] text-muted uppercase tracking-[.1em]">
            Page {currentPage} of {pageCount}
          </p>
          <div className="flex gap-2">
            <CodeRocketButton
              disabled={currentPage === 1}
              onClick={() => setPage(value => Math.max(1, value - 1))}
              size="sm"
              type="button"
              variant="outline"
            >
              Previous
            </CodeRocketButton>
            <CodeRocketButton
              disabled={currentPage === pageCount}
              onClick={() => setPage(value => Math.min(pageCount, value + 1))}
              size="sm"
              type="button"
              variant="outline"
            >
              Next
            </CodeRocketButton>
          </div>
        </div>
      ) : null}
    </section>
  )
}

/** Render a labeled shared select for one directory control. */
function DirectorySelect<T extends string>({
  id,
  label,
  onChange,
  options,
  value
}: {
  id: string
  label: string
  onChange: (value: T) => void
  options: Array<{ label: string; value: T }>
  value: T
}) {
  return (
    <label
      className="block font-mono text-[10px] text-muted uppercase tracking-[.1em]"
      htmlFor={id}
    >
      {label}
      <CodeRocketSelect
        className="mt-2 w-full"
        id={id}
        onChange={event => {
          const selected = options.find(option => option.value === event.target.value)
          if (selected) onChange(selected.value)
        }}
        value={value}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </CodeRocketSelect>
    </label>
  )
}
