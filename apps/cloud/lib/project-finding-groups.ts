import type { ProjectFinding } from './project-data'

export type FindingFilter = 'action' | 'all' | 'fixed' | 'muted' | 'new'
export type FindingImpact = 'all' | 'critical' | 'high' | 'important' | 'low' | 'medium'
export type FindingSort = 'affected-pages' | 'priority' | 'status' | 'title'

export interface FindingAdvancedFilters {
  category: string
  impact: FindingImpact
  page: string
  query: string
  sort: FindingSort
}

export const DEFAULT_FINDING_FILTERS: FindingAdvancedFilters = {
  category: 'all',
  impact: 'all',
  page: 'all',
  query: '',
  sort: 'priority'
}

export interface FindingGroup {
  category: ProjectFinding['category']
  evidence?: ProjectFinding['evidence']
  findings: ProjectFinding[]
  key: string
  message: string
  priority: ProjectFinding['priority']
  rule: string
  source: ProjectFinding['source']
  status: ProjectFinding['status']
  title: string
  workflowStatus: ProjectFinding['workflowStatus']
}

export interface FindingViewOptions extends FindingAdvancedFilters {
  filter: FindingFilter
}

/** Group repeated rule occurrences so one action can represent every affected page. */
export function groupProjectFindings(findings: ProjectFinding[]): FindingGroup[] {
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
  return [...groups.values()]
}

/** Apply the selected status view, advanced filters, search, and ordering. */
export function getVisibleFindingGroups(
  groups: FindingGroup[],
  options: FindingViewOptions
): FindingGroup[] {
  const queryTokens = options.query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return groups
    .filter(group => matchesFindingFilter(group, options.filter))
    .filter(group => matchesImpact(group, options.impact))
    .filter(group => options.category === 'all' || group.category === options.category)
    .filter(
      group =>
        options.page === 'all' || group.findings.some(finding => finding.path === options.page)
    )
    .filter(group => matchesQuery(group, queryTokens))
    .sort((left, right) => compareFindingGroups(left, right, options.sort))
}

/** Return whether a grouped finding belongs in the selected user-facing view. */
export function matchesFindingFilter(group: FindingGroup, filter: FindingFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'muted') return group.workflowStatus === 'muted'
  if (group.workflowStatus === 'muted') return false
  if (filter === 'new') return group.status === 'new'
  if (filter === 'fixed') return group.status === 'resolved'
  return group.status !== 'resolved'
}

/** Keep arbitrary tab values inside the supported finding filter union. */
export function resolveFindingFilter(value: string): FindingFilter {
  return value === 'all' || value === 'fixed' || value === 'muted' || value === 'new'
    ? value
    : 'action'
}

/** List every affected page represented by the current check. */
export function getFindingPages(groups: FindingGroup[]): string[] {
  return [...new Set(groups.flatMap(group => group.findings.map(finding => finding.path)))].sort()
}

/** List every health category represented by the current check. */
export function getFindingCategories(groups: FindingGroup[]): ProjectFinding['category'][] {
  return [...new Set(groups.map(group => group.category))].sort()
}

/** Return whether the list differs from its default search and ordering. */
export function hasActiveFindingFilters(filters: FindingAdvancedFilters): boolean {
  return (
    Boolean(filters.query.trim()) ||
    filters.impact !== 'all' ||
    filters.category !== 'all' ||
    filters.page !== 'all' ||
    filters.sort !== 'priority'
  )
}

function matchesImpact(group: FindingGroup, impact: FindingImpact): boolean {
  if (impact === 'all') return true
  if (impact === 'important') return group.priority === 'critical' || group.priority === 'high'
  return group.priority === impact
}

function matchesQuery(group: FindingGroup, tokens: string[]): boolean {
  if (tokens.length === 0) return true
  const searchableText = [
    group.title,
    group.message,
    group.rule.replaceAll('-', ' '),
    group.category,
    group.evidence?.summary,
    ...group.findings.map(finding => finding.path)
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return tokens.every(token => searchableText.includes(token))
}

function compareFindingGroups(left: FindingGroup, right: FindingGroup, sort: FindingSort): number {
  if (sort === 'title') return left.title.localeCompare(right.title)
  if (sort === 'affected-pages') {
    const pageDifference = uniquePageCount(right) - uniquePageCount(left)
    if (pageDifference !== 0) return pageDifference
  }
  if (sort === 'status') {
    const statusDifference = statusRank(left.status) - statusRank(right.status)
    if (statusDifference !== 0) return statusDifference
  }
  const priorityDifference = priorityRank(left.priority) - priorityRank(right.priority)
  return priorityDifference !== 0
    ? priorityDifference
    : statusRank(left.status) - statusRank(right.status)
}

function uniquePageCount(group: FindingGroup): number {
  return new Set(group.findings.map(finding => finding.path)).size
}

function priorityRank(priority: ProjectFinding['priority']): number {
  return { critical: 0, high: 1, medium: 2, low: 3 }[priority]
}

function statusRank(status: ProjectFinding['status']): number {
  return { new: 0, persistent: 1, resolved: 2 }[status]
}
