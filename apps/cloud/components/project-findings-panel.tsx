'use client'

import { CheckCircle2 } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { Tabs, TabsList, TabsTrigger } from '@repo/design-system/ui/tabs'
import { useMemo, useState } from 'react'
import type { ProjectFinding } from '@/lib/project-data'
import {
  DEFAULT_FINDING_FILTERS,
  type FindingFilter,
  getFindingCategories,
  getFindingPages,
  getVisibleFindingGroups,
  groupProjectFindings,
  hasActiveFindingFilters,
  matchesFindingFilter,
  resolveFindingFilter
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
  const [filter, setFilter] = useState<FindingFilter>('action')
  const [advancedFilters, setAdvancedFilters] = useState(DEFAULT_FINDING_FILTERS)
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE)
  const groups = useMemo(() => groupProjectFindings(findings), [findings])
  const categories = useMemo(() => getFindingCategories(groups), [groups])
  const pages = useMemo(() => getFindingPages(groups), [groups])
  const visible = useMemo(
    () => getVisibleFindingGroups(groups, { ...advancedFilters, filter }),
    [advancedFilters, filter, groups]
  )
  const shown = visible.slice(0, visibleLimit)
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

  function updateAdvancedFilters(filters: typeof DEFAULT_FINDING_FILTERS) {
    setAdvancedFilters(filters)
    setVisibleLimit(PAGE_SIZE)
  }

  function clearAdvancedFilters() {
    setAdvancedFilters(DEFAULT_FINDING_FILTERS)
    setVisibleLimit(PAGE_SIZE)
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
          setFilter(resolveFindingFilter(value))
          setVisibleLimit(PAGE_SIZE)
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
            {shown.length < visible.length ? (
              <div className="flex flex-col items-center justify-between gap-3 bg-background px-5 py-4 sm:flex-row">
                <p className="text-muted text-xs">
                  Showing {shown.length} of {visible.length} matching problems.
                </p>
                <CodeRocketButton
                  onClick={() => setVisibleLimit(limit => limit + PAGE_SIZE)}
                  size="sm"
                  variant="outline"
                >
                  Show {Math.min(PAGE_SIZE, visible.length - shown.length)} more
                </CodeRocketButton>
              </div>
            ) : null}
          </div>
        )}
      </Tabs>
    </section>
  )
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
