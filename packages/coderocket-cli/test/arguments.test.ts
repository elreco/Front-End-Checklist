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
        'abc'
      ],
      {}
    )
    assert.equal(options.environment, 'preview')
    assert.equal(options.sha, 'abc')
  })

  it('rejects non-HTTPS targets', () => {
    assert.throws(
      () => parseArguments(['audit', 'http://localhost', '--token', 'secret'], {}),
      /HTTPS/
    )
  })
})
