import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isStudioWorkspaceRoute, resolveSidebarCollapsed } from '../lib/sidebar-layout'

describe('product sidebar layout', () => {
  it('automatically gives each Studio workspace the compact sidebar', () => {
    assert.equal(isStudioWorkspaceRoute('/studio/site-id'), true)
    assert.equal(
      resolveSidebarCollapsed({
        pathname: '/studio/site-id',
        preferredCollapsed: false
      }),
      true
    )
  })

  it('lets the current Studio workspace be expanded without changing other routes', () => {
    assert.equal(
      resolveSidebarCollapsed({
        expandedStudioPath: '/studio/site-id',
        pathname: '/studio/site-id',
        preferredCollapsed: true
      }),
      false
    )
    assert.equal(
      resolveSidebarCollapsed({
        expandedStudioPath: '/studio/site-id',
        pathname: '/studio/another-site',
        preferredCollapsed: false
      }),
      true
    )
    assert.equal(
      resolveSidebarCollapsed({
        expandedStudioPath: '/studio/site-id',
        pathname: '/dashboard',
        preferredCollapsed: false
      }),
      false
    )
  })
})
