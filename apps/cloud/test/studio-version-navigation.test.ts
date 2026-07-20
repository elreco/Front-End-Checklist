import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { studioVersionHref } from '../app/studio/[siteId]/studio-version-navigation'

const earlier = {
  createdAt: '2026-07-20T17:10:00.000Z',
  id: 'revision-4',
  revisionNumber: 4,
  title: 'Added a pricing page'
}

describe('Studio version navigation', () => {
  it('opens an earlier version without changing or copying it', () => {
    assert.equal(
      studioVersionHref('site-1', earlier, '/pricing', 'revision-5'),
      '/studio/site-1?version=revision-4&page=%2Fpricing'
    )
  })

  it('keeps the latest version URL clean', () => {
    assert.equal(studioVersionHref('site-1', earlier, '/', 'revision-4'), '/studio/site-1')
  })
})
