import type { DashboardProject } from './dashboard-data'

export type SiteDirectoryStatus =
  | 'all'
  | 'attention'
  | 'checking'
  | 'clear'
  | 'incomplete'
  | 'setup'

export type SiteDirectoryAccess = 'all' | 'public' | 'restricted'
export type SiteDirectorySort = 'name' | 'new-problems' | 'pages' | 'recent'

export interface SiteDirectoryOptions {
  access: SiteDirectoryAccess
  query: string
  sort: SiteDirectorySort
  status: SiteDirectoryStatus
}

/** Search, filter, and sort monitored sites without mutating the source collection. */
export function getVisibleSites(
  projects: DashboardProject[],
  options: SiteDirectoryOptions
): DashboardProject[] {
  const query = options.query.trim().toLocaleLowerCase()
  return projects
    .filter(project => {
      const matchesQuery =
        query.length === 0 ||
        project.name.toLocaleLowerCase().includes(query) ||
        project.url.toLocaleLowerCase().includes(query)
      const matchesStatus =
        options.status === 'all' || getSiteDirectoryStatus(project) === options.status
      const matchesAccess =
        options.access === 'all' ||
        (options.access === 'public'
          ? project.accessMode === 'public'
          : project.accessMode !== 'public')
      return matchesQuery && matchesStatus && matchesAccess
    })
    .sort((left, right) => compareSites(left, right, options.sort))
}

/** Resolve the single operational state used by the sites directory filters. */
export function getSiteDirectoryStatus(project: DashboardProject): SiteDirectoryStatus {
  if (project.isChecking) return 'checking'
  if (!project.hasCompletedCheck) return 'setup'
  if (project.gate === 'failed') return 'attention'
  if (project.gate === 'inconclusive') return 'incomplete'
  return 'clear'
}

/** Compare two monitored sites using a stable, user-selected ordering. */
function compareSites(
  left: DashboardProject,
  right: DashboardProject,
  sort: SiteDirectorySort
): number {
  if (sort === 'name') return left.name.localeCompare(right.name)
  if (sort === 'new-problems')
    return right.blockingCount - left.blockingCount || left.name.localeCompare(right.name)
  if (sort === 'pages')
    return right.pageCount - left.pageCount || left.name.localeCompare(right.name)
  return Date.parse(right.createdAt) - Date.parse(left.createdAt)
}
