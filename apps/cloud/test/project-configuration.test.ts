import assert from 'node:assert/strict'
import test from 'node:test'
import {
  normalizeEditablePagePaths,
  projectConfigurationChanged
} from '../lib/project-configuration'
import { getPageHttpStatus, getProjectRecoveryKind } from '../lib/project-recovery'
import { getProjectEditorSubmitLabel } from '../lib/project-site-editor'

test('normalizes paths and same-origin full URLs for editing', () => {
  assert.deepEqual(
    normalizeEditablePagePaths(
      ['/', 'pricing/', 'https://example.com/contact', '/pricing'],
      'https://example.com'
    ),
    ['/', '/pricing', '/contact']
  )
})

test('rejects a monitored page from another website', () => {
  assert.throws(
    () => normalizeEditablePagePaths(['https://unrelated.example/pricing'], 'https://example.com'),
    /must belong to the website address/
  )
})

test('detects configuration changes including page ordering', () => {
  assert.equal(
    projectConfigurationChanged(
      { url: 'https://example.com', pages: ['/', '/pricing'] },
      { url: 'https://example.com', pages: ['/', '/pricing'] }
    ),
    false
  )
  assert.equal(
    projectConfigurationChanged(
      { url: 'https://example.com', pages: ['/', '/pricing'] },
      { url: 'https://example.com', pages: ['/pricing', '/'] }
    ),
    true
  )
  assert.equal(
    projectConfigurationChanged(
      {
        url: 'https://example.com',
        pages: ['/', '/pricing'],
        authenticatedPages: []
      },
      {
        url: 'https://example.com',
        pages: ['/', '/pricing'],
        authenticatedPages: ['/pricing']
      }
    ),
    true
  )
  assert.equal(
    projectConfigurationChanged(
      {
        url: 'https://example.com',
        pages: ['/', '/pricing'],
        authenticatedPages: [],
        secureRunnerRequired: false
      },
      {
        url: 'https://example.com',
        pages: ['/', '/pricing'],
        authenticatedPages: [],
        secureRunnerRequired: true
      }
    ),
    true
  )
})

test('routes 404 failures toward URL correction rather than CI', () => {
  const page = {
    path: '/pricing',
    url: 'https://example.com/pricing',
    reachable: false,
    error: 'HTTP 404'
  }
  assert.equal(getPageHttpStatus(page), 404)
  assert.equal(getProjectRecoveryKind([page]), 'pages')
})

test('routes access challenges toward CI and timeouts toward retry', () => {
  assert.equal(
    getProjectRecoveryKind([
      {
        path: '/account',
        url: 'https://example.com/account',
        reachable: false,
        error: 'The site returned a Cloudflare challenge instead of the page'
      }
    ]),
    'access'
  )
  assert.equal(
    getProjectRecoveryKind([
      {
        path: '/',
        url: 'https://example.com/',
        reachable: false,
        error: 'Website request timed out'
      }
    ]),
    'temporary'
  )
})

test('makes a different-domain replacement explicit in the submit action', () => {
  assert.equal(
    getProjectEditorSubmitLabel({
      checkAfterSave: true,
      originChanged: true,
      saving: false
    }),
    'Replace address and check'
  )
})
