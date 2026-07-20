import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  normalizeHttpsOrigin,
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

  it('accepts a protected HTTPS origin without requiring public network reachability', () => {
    assert.equal(
      normalizeHttpsOrigin('https://internal.example.test/app'),
      'https://internal.example.test'
    )
    assert.throws(() => normalizeHttpsOrigin('http://internal.example.test'), /HTTPS/)
    assert.throws(() => normalizeHttpsOrigin('https://user:secret@example.com'), /credentials/)
  })

  it('rejects protocol-relative, query, fragment, and oversized paths', () => {
    assert.throws(() => normalizeProjectPagePath('//other.example/private'), /hostname/)
    assert.throws(() => normalizeProjectPagePath('/search?q=secret'), /query strings/)
    assert.throws(() => normalizeProjectPagePath('/pricing#plans'), /fragments/)
    assert.throws(() => normalizeProjectPagePath(`/${'a'.repeat(2048)}`), /2048/)
  })

})
