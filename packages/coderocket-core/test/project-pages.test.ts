import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildProjectPageUrl,
  normalizeProjectPagePath,
  normalizeProjectPagePaths
} from '../src/index'

describe('CodeRocket project page paths', () => {
  it('normalizes ordinary paths and removes duplicates', () => {
    assert.deepEqual(normalizeProjectPagePaths(['/', 'pricing/', '/pricing', ' /contact ']), [
      '/',
      '/pricing',
      '/contact'
    ])
  })

  it('rejects protocol-relative, query, fragment, and oversized paths', () => {
    assert.throws(() => normalizeProjectPagePath('//other.example/private'), /hostname/)
    assert.throws(() => normalizeProjectPagePath('/search?q=secret'), /query strings/)
    assert.throws(() => normalizeProjectPagePath('/pricing#plans'), /fragments/)
    assert.throws(() => normalizeProjectPagePath(`/${'a'.repeat(2048)}`), /2048/)
  })

  it('always builds a URL on the monitored origin', () => {
    assert.equal(
      buildProjectPageUrl('https://www.example.com/base', '/pricing'),
      'https://www.example.com/pricing'
    )
    assert.throws(
      () => buildProjectPageUrl('https://www.example.com', '//other.example'),
      /hostname/
    )
  })
})
