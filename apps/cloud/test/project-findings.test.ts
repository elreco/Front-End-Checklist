import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ProjectFinding } from '../lib/project-data'
import {
  DEFAULT_FINDING_VIEW_STATE,
  type FindingViewOptions,
  getVisibleFindingGroups,
  groupProjectFindings,
  readFindingViewSearchParams,
  writeFindingViewSearchParams
} from '../lib/project-finding-groups'

const defaults: FindingViewOptions = {
  category: 'all',
  filter: 'action',
  impact: 'all',
  page: 'all',
  query: '',
  sort: 'priority'
}

const findings: ProjectFinding[] = [
  finding({ id: 'one', priority: 'medium', rule: 'image-size', path: '/', title: 'Resize images' }),
  finding({
    id: 'two',
    priority: 'medium',
    rule: 'image-size',
    path: '/work',
    title: 'Resize images'
  }),
  finding({
    id: 'three',
    priority: 'high',
    rule: 'labels',
    path: '/contact',
    title: 'Label fields',
    category: 'accessibility'
  }),
  finding({
    id: 'four',
    priority: 'low',
    rule: 'meta',
    path: '/',
    title: 'Improve metadata',
    status: 'resolved'
  })
]

describe('project finding filters', () => {
  it('groups repeated rules while preserving every affected page', () => {
    const groups = groupProjectFindings(findings)
    assert.equal(groups.length, 3)
    assert.deepEqual(
      groups.find(group => group.rule === 'image-size')?.findings.map(item => item.path),
      ['/', '/work']
    )
  })

  it('combines status, impact, category, page, and search filters', () => {
    const groups = groupProjectFindings(findings)
    const visible = getVisibleFindingGroups(groups, {
      ...defaults,
      category: 'accessibility',
      impact: 'important',
      page: '/contact',
      query: 'label contact'
    })
    assert.deepEqual(
      visible.map(group => group.rule),
      ['labels']
    )
  })

  it('sorts by page coverage and title without mutating the source groups', () => {
    const groups = groupProjectFindings(findings)
    const originalOrder = groups.map(group => group.rule)
    assert.equal(
      getVisibleFindingGroups(groups, { ...defaults, sort: 'affected-pages' })[0]?.rule,
      'image-size'
    )
    assert.deepEqual(
      getVisibleFindingGroups(groups, { ...defaults, filter: 'all', sort: 'title' }).map(
        group => group.title
      ),
      ['Improve metadata', 'Label fields', 'Resize images']
    )
    assert.deepEqual(
      groups.map(group => group.rule),
      originalOrder
    )
  })

  it('round-trips a filtered and paginated view through the query string', () => {
    const serialized = writeFindingViewSearchParams(new URLSearchParams('notice=queued'), {
      ...DEFAULT_FINDING_VIEW_STATE,
      category: 'accessibility',
      filter: 'new',
      impact: 'important',
      page: '/contact',
      query: 'label field',
      resultPage: 3,
      sort: 'affected-pages'
    })

    assert.equal(serialized.get('notice'), 'queued')
    assert.deepEqual(readFindingViewSearchParams(serialized), {
      category: 'accessibility',
      filter: 'new',
      impact: 'important',
      page: '/contact',
      query: 'label field',
      resultPage: 3,
      sort: 'affected-pages'
    })
  })
})

function finding(
  overrides: Partial<ProjectFinding> & Pick<ProjectFinding, 'id' | 'rule' | 'title'>
): ProjectFinding {
  return {
    findingId: overrides.id,
    projectId: 'project',
    status: 'persistent',
    priority: 'medium',
    path: '/',
    message: overrides.title,
    category: 'images',
    source: 'frontend_checklist',
    documentationUrl: '/docs/rules',
    workflowStatus: 'open',
    ...overrides
  }
}
