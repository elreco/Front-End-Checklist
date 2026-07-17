import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { DashboardProject } from '../lib/dashboard-data'
import { getSiteDirectoryStatus, getVisibleSites } from '../lib/site-directory'

const projects: DashboardProject[] = [
  createProject({
    id: 'clear',
    name: 'Alpha Store',
    createdAt: '2026-07-15T00:00:00.000Z',
    gate: 'passed'
  }),
  createProject({
    id: 'attention',
    name: 'Beta Shop',
    createdAt: '2026-07-17T00:00:00.000Z',
    gate: 'failed',
    blockingCount: 4
  }),
  createProject({
    id: 'private',
    name: 'Client Portal',
    accessMode: 'private',
    createdAt: '2026-07-16T00:00:00.000Z',
    hasCompletedCheck: false
  })
]

describe('sites directory', () => {
  it('combines search, status, and access filters', () => {
    const result = getVisibleSites(projects, {
      access: 'restricted',
      query: 'portal',
      sort: 'recent',
      status: 'setup'
    })
    assert.deepEqual(
      result.map(project => project.id),
      ['private']
    )
  })

  it('sorts recent sites and problem-heavy sites predictably', () => {
    const recent = getVisibleSites(projects, {
      access: 'all',
      query: '',
      sort: 'recent',
      status: 'all'
    })
    const problems = getVisibleSites(projects, {
      access: 'all',
      query: '',
      sort: 'new-problems',
      status: 'all'
    })
    assert.deepEqual(
      recent.map(project => project.id),
      ['attention', 'private', 'clear']
    )
    assert.equal(problems[0]?.id, 'attention')
  })

  it('prioritizes live operational states over the saved gate', () => {
    const privateProject = projects.find(project => project.id === 'private')
    assert.ok(privateProject)
    assert.equal(getSiteDirectoryStatus(privateProject), 'setup')
    assert.equal(
      getSiteDirectoryStatus(createProject({ id: 'running', isChecking: true })),
      'checking'
    )
  })
})

/** Build a complete monitored-site fixture with explicit overrides. */
function createProject(overrides: Partial<DashboardProject> & Pick<DashboardProject, 'id'>) {
  return {
    id: overrides.id,
    name: 'Example site',
    url: `https://${overrides.id}.example`,
    createdAt: '2026-07-14T00:00:00.000Z',
    accessMode: 'public',
    hasCompletedCheck: true,
    pageCount: 3,
    gate: 'needs_baseline',
    blockingCount: 0,
    newCount: 0,
    requestedPageCount: 3,
    checkedPageCount: 3,
    lastRun: 'today',
    nextCheck: 'tomorrow',
    isChecking: false,
    ...overrides
  } satisfies DashboardProject
}
