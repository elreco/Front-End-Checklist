import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProjectTechnicalDetails } from '../components/project-technical-details'

Object.defineProperty(globalThis, 'React', { configurable: true, value: React })

describe('project technical details', () => {
  it('keeps the safe document receipt behind progressive disclosure', () => {
    const html = renderToStaticMarkup(
      React.createElement(ProjectTechnicalDetails, {
        pages: [
          {
            document: {
              byteLength: 2048,
              fetchedAt: '2026-07-18T10:00:00.000Z',
              htmlOutline: '<html lang="en">\n<head>\n<title>Account</title>\n</head>\n</html>',
              sha256: 'a'.repeat(64),
              cacheStatus: 'Cloudflare: HIT',
              contentType: 'text/html',
              title: 'Account'
            },
            durationMs: 250,
            finalUrl: 'https://example.com/dashboard',
            httpStatus: 200,
            path: '/dashboard',
            reachable: true,
            url: 'https://example.com/dashboard'
          }
        ],
        rulesetVersion: 'frontend-checklist-test'
      })
    )

    assert.match(html, /Technical details/)
    assert.match(html, /Documents received/)
    assert.match(html, /never the complete page source/)
    assert.match(html, /View received server HTML/)
    assert.match(html, /Cloudflare: HIT/)
    assert.match(html, /aaaaaaaaaaaaaaaa/)
    assert.doesNotMatch(html, /a{64}/)
  })

  it('explains why an older successful check has no document receipt', () => {
    const html = renderToStaticMarkup(
      React.createElement(ProjectTechnicalDetails, {
        pages: [
          {
            path: '/',
            reachable: true,
            url: 'https://example.com/'
          }
        ],
        rulesetVersion: 'frontend-checklist-legacy'
      })
    )

    assert.match(html, /older check predates document receipts/)
  })
})
