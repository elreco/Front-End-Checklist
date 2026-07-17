'use client'

import { CheckCircle2 } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { Tabs, TabsList, TabsTrigger } from '@repo/design-system/ui/tabs'
import { useMemo, useState } from 'react'
import type { ProjectFinding } from '@/lib/project-data'
import { ProjectAnalysisSummary } from './project-analysis-summary'
import { type FindingGroup, ProjectFindingGroupCard } from './project-finding-group-card'

type FindingFilter = 'action' | 'all' | 'fixed' | 'muted' | 'new'
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
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE)
  const groups = useMemo(() => groupFindings(findings), [findings])
  const visible = groups.filter(group => matchesFilter(group, filter))
  const shown = visible.slice(0, visibleLimit)
  const filterOptions: Array<{ count: number; label: string; value: FindingFilter }> = [
    {
      value: 'action',
      label: 'Open',
      count: groups.filter(group => matchesFilter(group, 'action')).length
    },
    {
      value: 'new',
      label: 'New',
      count: groups.filter(group => matchesFilter(group, 'new')).length
    },
    {
      value: 'fixed',
      label: 'Fixed',
      count: groups.filter(group => matchesFilter(group, 'fixed')).length
    },
    {
      value: 'muted',
      label: 'Ignored',
      count: groups.filter(group => matchesFilter(group, 'muted')).length
    },
    { value: 'all', label: 'Everything', count: groups.length }
  ]
  const newCount = filterOptions.find(option => option.value === 'new')?.count ?? 0
  const knownCount = groups.filter(
    group => matchesFilter(group, 'action') && group.status === 'persistent'
  ).length
  const importantCount = groups.filter(
    group =>
      matchesFilter(group, 'action') && (group.priority === 'critical' || group.priority === 'high')
  ).length

  return (
    <section aria-labelledby="findings-title" className="border border-border bg-surface">
      <div className="grid border-border border-b xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,.8fr)]">
        <div className="p-5 sm:p-6">
          <div>
            <h2 className="font-heading font-semibold text-xl" id="findings-title">
              What needs attention
            </h2>
            <p className="mt-1 max-w-2xl text-muted text-sm leading-6">
              Similar problems are grouped together. Each item shows the affected pages, what
              CodeRocket found, and how to fix it.
            </p>
          </div>
          <Tabs
            className="mt-5"
            onValueChange={value => {
              setFilter(resolveFilter(value))
              setVisibleLimit(PAGE_SIZE)
            }}
            value={filter}
          >
            <TabsList
              aria-label="Filter website problems"
              className="grid w-full grid-cols-2 gap-px rounded-none border border-border bg-border p-0 sm:inline-grid sm:w-auto sm:grid-cols-5"
            >
              {filterOptions.map(option => (
                <TabsTrigger
                  className="group min-h-11 justify-between gap-3 rounded-none bg-surface px-4 py-2 font-mono text-muted text-xs hover:bg-surface-raised hover:text-foreground data-[state=active]:border-signal data-[state=active]:bg-surface-raised data-[state=active]:text-signal"
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
          </Tabs>
        </div>
        <ProjectAnalysisSummary
          importantCount={importantCount}
          knownCount={knownCount}
          newCount={newCount}
        />
      </div>

      {visible.length === 0 ? (
        <div className="p-10 text-center">
          <CheckCircle2 aria-hidden className="mx-auto h-8 w-8 text-success" />
          <p className="mt-3 font-semibold">
            {filter === 'action' ? 'Nothing needs your attention' : 'Nothing in this view'}
          </p>
          <p className="mx-auto mt-2 max-w-md text-muted text-sm leading-6">
            {filter === 'action'
              ? 'You are caught up. The next complete check will add anything that changes.'
              : 'Choose another view, or wait for the next complete website check.'}
          </p>
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
                Showing {shown.length} of {visible.length} problems in this view.
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
    </section>
  )
}

function groupFindings(findings: ProjectFinding[]): FindingGroup[] {
  const groups = new Map<string, FindingGroup>()
  for (const finding of findings) {
    const key = [finding.rule, finding.status, finding.priority, finding.workflowStatus].join(':')
    const existing = groups.get(key)
    if (existing) {
      existing.findings.push(finding)
      continue
    }
    groups.set(key, { ...finding, findings: [finding], key })
  }
  return [...groups.values()].sort((left, right) => {
    const priorityDifference = priorityRank(left.priority) - priorityRank(right.priority)
    return priorityDifference !== 0
      ? priorityDifference
      : statusRank(left.status) - statusRank(right.status)
  })
}

function matchesFilter(group: FindingGroup, filter: FindingFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'muted') return group.workflowStatus === 'muted'
  if (group.workflowStatus === 'muted') return false
  if (filter === 'new') return group.status === 'new'
  if (filter === 'fixed') return group.status === 'resolved'
  return group.status !== 'resolved'
}

function resolveFilter(value: string): FindingFilter {
  return value === 'all' || value === 'fixed' || value === 'muted' || value === 'new'
    ? value
    : 'action'
}

function priorityRank(priority: ProjectFinding['priority']): number {
  return { critical: 0, high: 1, medium: 2, low: 3 }[priority]
}

function statusRank(status: ProjectFinding['status']): number {
  return { new: 0, persistent: 1, resolved: 2 }[status]
}
