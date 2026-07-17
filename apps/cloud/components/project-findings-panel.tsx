'use client'

import { CheckCircle2 } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { Tabs, TabsList, TabsTrigger } from '@repo/design-system/ui/tabs'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { ProjectFinding } from '@/lib/project-data'
import {
  DEFAULT_FINDING_FILTERS,
  DEFAULT_FINDING_VIEW_STATE,
  type FindingFilter,
  type FindingViewState,
  getFindingCategories,
  getFindingPages,
  getVisibleFindingGroups,
  groupProjectFindings,
  hasActiveFindingFilters,
  matchesFindingFilter,
  readFindingViewSearchParams,
  resolveFindingFilter,
  writeFindingViewSearchParams
} from '@/lib/project-finding-groups'
import { ProjectAnalysisSummary } from './project-analysis-summary'
import { ProjectFindingGroupCard } from './project-finding-group-card'
import { ProjectFindingsControls } from './project-findings-controls'

const PAGE_SIZE = 8

/** Groups repeated page occurrences into a filterable, evidence-first action list. */
export function ProjectFindingsPanel({
  findings,
  updateWorkflow
}: {
  findings: ProjectFinding[]
  updateWorkflow: (formData: FormData) => Promise<void>
}) {
  const searchParams = useSearchParams()
  const groups = useMemo(() => groupProjectFindings(findings), [findings])
  const categories = useMemo(() => getFindingCategories(groups), [groups])
  const pages = useMemo(() => getFindingPages(groups), [groups])
  const [view, setView] = useState<FindingViewState>(() =>
    normalizeInitialView(readFindingViewSearchParams(searchParams), categories, pages)
  )
  const { filter, resultPage, ...advancedFilters } = view
  const visible = useMemo(
    () => getVisibleFindingGroups(groups, { ...advancedFilters, filter }),
    [advancedFilters, filter, groups]
  )
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const currentPage = Math.min(resultPage, pageCount)
  const shown = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const filterOptions = getFilterOptions(groups)
  const activeFilter = filterOptions.find(option => option.value === filter) ?? filterOptions[0]
  const newCount = filterOptions.find(option => option.value === 'new')?.count ?? 0
  const knownCount = groups.filter(
    group => matchesFindingFilter(group, 'action') && group.status === 'persistent'
  ).length
  const importantCount = groups.filter(
    group =>
      matchesFindingFilter(group, 'action') &&
      (group.priority === 'critical' || group.priority === 'high')
  ).length
  const advancedFiltersActive = hasActiveFindingFilters(advancedFilters)

  useEffect(() => {
    const nextSearchParams = writeFindingViewSearchParams(
      new URLSearchParams(window.location.search),
      view
    )
    const query = nextSearchParams.toString()
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
    window.history.replaceState(window.history.state, '', nextUrl)
  }, [view])

  useEffect(() => {
    if (resultPage > pageCount) setView(current => ({ ...current, resultPage: pageCount }))
  }, [pageCount, resultPage])

  function updateAdvancedFilters(filters: typeof DEFAULT_FINDING_FILTERS) {
    setView(current => ({ ...current, ...filters, resultPage: 1 }))
  }

  function clearAdvancedFilters() {
    setView(current => ({ ...current, ...DEFAULT_FINDING_FILTERS, resultPage: 1 }))
  }

  return (
    <section aria-labelledby="findings-title" className="border border-border bg-surface">
      <div className="grid border-border border-b xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,.8fr)]">
        <div className="p-5 sm:p-6">
          <h2 className="font-heading font-semibold text-xl" id="findings-title">
            What needs attention
          </h2>
          <p className="mt-1 max-w-2xl text-muted text-sm leading-6">
            Similar problems are grouped together. Search, filter, and sort them to plan the next
            fixes across the affected pages.
          </p>
        </div>
        <ProjectAnalysisSummary
          importantCount={importantCount}
          knownCount={knownCount}
          newCount={newCount}
        />
      </div>

      <Tabs
        onValueChange={value => {
          setView(current => ({
            ...current,
            filter: resolveFindingFilter(value),
            resultPage: 1
          }))
        }}
        value={filter}
      >
        <div className="flex flex-col gap-3 border-border border-b bg-background px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            <TabsList
              aria-label="Filter website problems"
              className="inline-grid min-w-max auto-cols-[minmax(88px,auto)] grid-flow-col gap-px rounded-none border border-border bg-border p-0"
            >
              {filterOptions.map(option => (
                <TabsTrigger
                  className="group min-h-10 gap-2 rounded-none bg-surface px-3 py-2 font-mono text-muted text-xs hover:bg-surface-raised hover:text-foreground data-[state=active]:border-signal data-[state=active]:bg-surface-raised data-[state=active]:text-signal"
                  key={option.value}
                  value={option.value}
                  variant="underline"
                >
                  <span>{option.label}</span>
                  <span
                    className="min-w-4 text-right text-[10px] text-muted group-data-[state=active]:text-signal"
                    data-slot="filter-count"
                  >
                    {option.count}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <p
            aria-live="polite"
            className="shrink-0 font-mono text-[10px] text-muted uppercase tracking-[.1em]"
          >
            <span className="text-foreground">{visible.length}</span>{' '}
            {activeFilter?.label.toLowerCase()} {visible.length === 1 ? 'problem' : 'problems'}
          </p>
        </div>

        <ProjectFindingsControls
          categories={categories}
          filters={advancedFilters}
          onChange={updateAdvancedFilters}
          pages={pages}
        />

        {advancedFiltersActive ? (
          <div className="flex items-center justify-between gap-3 border-border border-b bg-background px-5 py-3 sm:px-6">
            <p className="text-muted text-xs">
              Showing <span className="font-semibold text-foreground">{visible.length}</span> of{' '}
              {groups.filter(group => matchesFindingFilter(group, filter)).length} problems in this
              view.
            </p>
            <CodeRocketButton
              onClick={clearAdvancedFilters}
              size="sm"
              type="button"
              variant="ghost"
            >
              Clear filters
            </CodeRocketButton>
          </div>
        ) : null}

        {visible.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2 aria-hidden className="mx-auto h-8 w-8 text-success" />
            <p className="mt-3 font-semibold">
              {advancedFiltersActive
                ? 'No problems match these filters'
                : filter === 'action'
                  ? 'Nothing needs your attention'
                  : 'Nothing in this view'}
            </p>
            <p className="mx-auto mt-2 max-w-md text-muted text-sm leading-6">
              {advancedFiltersActive
                ? 'Try another search, page, area, or impact level.'
                : 'Choose another view, or wait for the next complete website check.'}
            </p>
            {advancedFiltersActive ? (
              <CodeRocketButton
                className="mt-5"
                onClick={clearAdvancedFilters}
                type="button"
                variant="outline"
              >
                Show every problem in this view
              </CodeRocketButton>
            ) : null}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {shown.map(group => (
              <ProjectFindingGroupCard
                documentationUrl={group.findings[0]?.documentationUrl ?? '/docs/rules'}
                group={group}
                key={group.key}
                updateWorkflow={updateWorkflow}
              />
            ))}
            {pageCount > 1 ? (
              <div className="flex flex-col items-center justify-between gap-3 bg-background px-5 py-4 sm:flex-row">
                <p className="text-muted text-xs">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(currentPage * PAGE_SIZE, visible.length)} of {visible.length} matching
                  problems.
                </p>
                <div className="flex items-center gap-3">
                  <CodeRocketButton
                    disabled={currentPage === 1}
                    onClick={() =>
                      setView(current => ({
                        ...current,
                        resultPage: Math.max(1, current.resultPage - 1)
                      }))
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Previous
                  </CodeRocketButton>
                  <span className="font-mono text-[10px] text-muted uppercase tracking-[.1em]">
                    Page {currentPage} of {pageCount}
                  </span>
                  <CodeRocketButton
                    disabled={currentPage === pageCount}
                    onClick={() =>
                      setView(current => ({
                        ...current,
                        resultPage: Math.min(pageCount, current.resultPage + 1)
                      }))
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Next
                  </CodeRocketButton>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Tabs>
    </section>
  )
}

function normalizeInitialView(
  view: FindingViewState,
  categories: ProjectFinding['category'][],
  pages: string[]
): FindingViewState {
  return {
    ...DEFAULT_FINDING_VIEW_STATE,
    ...view,
    category:
      view.category === 'all' || categories.some(category => category === view.category)
        ? view.category
        : 'all',
    page: view.page === 'all' || pages.includes(view.page) ? view.page : 'all'
  }
}

function getFilterOptions(groups: ReturnType<typeof groupProjectFindings>) {
  const options: Array<{ count: number; label: string; value: FindingFilter }> = [
    { value: 'action', label: 'Open', count: 0 },
    { value: 'new', label: 'New', count: 0 },
    { value: 'fixed', label: 'Fixed', count: 0 },
    { value: 'muted', label: 'Ignored', count: 0 },
    { value: 'all', label: 'All', count: groups.length }
  ]
  return options.map(option => ({
    ...option,
    count:
      option.value === 'all'
        ? groups.length
        : groups.filter(group => matchesFindingFilter(group, option.value)).length
  }))
}
