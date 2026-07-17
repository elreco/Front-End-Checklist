import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseArguments } from '../src/arguments'

describe('CodeRocket CLI arguments', () => {
  it('parses the documented preview workflow', () => {
    const options = parseArguments(
      [
        'audit',
        'https://preview.example.com',
        '--token',
        'secret',
        '--environment',
        'preview',
        '--sha',
        'abc',
        '--page',
        '/checkout'
      ],
      {}
    )
    assert.equal(options.environment, 'preview')
    assert.equal(options.sha, 'abc')
    assert.deepEqual(options.urls, [
      'https://preview.example.com/',
      'https://preview.example.com/checkout'
    ])
  })

  it('rejects non-HTTPS targets', () => {
    assert.throws(
      () => parseArguments(['audit', 'http://localhost', '--token', 'secret'], {}),
      /HTTPS/
    )
  })

  it('reads private page headers from an environment secret', () => {
    const options = parseArguments(['audit', 'https://app.example.com', '--token', 'secret'], {
      CODEROCKET_SITE_HEADERS_JSON: JSON.stringify({
        cookie: 'session=test-session',
        'cf-access-client-id': 'client-id'
      })
    })
    assert.deepEqual(options.requestHeaders, {
      cookie: 'session=test-session',
      'cf-access-client-id': 'client-id'
    })
  })

  it('rejects malformed private page headers', () => {
    assert.throws(
      () =>
        parseArguments(['audit', 'https://app.example.com', '--token', 'secret'], {
          CODEROCKET_SITE_HEADERS_JSON: 'not-json'
        }),
      /valid JSON/
    )
  })

  it('rejects runner pages on another origin', () => {
    assert.throws(
      () =>
        parseArguments(
          [
            'audit',
            'https://app.example.com',
            '--token',
            'secret',
            '--page',
            'https://other.example.com/private'
          ],
          {}
        ),
      /same audited HTTPS origin/
    )
  })
})
