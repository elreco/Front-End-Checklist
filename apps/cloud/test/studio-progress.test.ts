import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { StudioProgressCaptures } from '../app/studio/[siteId]/studio-progress-activity'
import {
  parseStudioImportProgress,
  studioProgressGuidance,
  studioProgressPercent,
  studioQueueIsDelayed
} from '../app/studio/[siteId]/studio-progress-model'

Object.defineProperty(globalThis, 'React', { configurable: true, value: React })

describe('website recreation progress', () => {
  it('accepts only the owner-safe public progress shape', () => {
    const progress = parseStudioImportProgress({
      status: 'analyzing',
      message: 'Understanding the visual identity',
      stage: 'comparing',
      current: 1,
      total: 3,
      createdAt: '2026-07-20T12:00:00.000Z',
      updatedAt: '2026-07-20T12:01:00.000Z',
      attempts: 1,
      workerAvailable: true,
      events: [
        {
          id: 'event-id',
          key: 'visual-ai-started',
          kind: 'ai',
          title: 'Design assistant is studying the page',
          detail: 'Comparing the computer and phone views.',
          progress: 40,
          createdAt: '2026-07-20T12:01:00.000Z'
        }
      ]
    })

    assert.ok(progress)
    assert.equal(studioProgressPercent(progress), 40)
  })

  it('rejects raw technical fields and invalid progress values', () => {
    assert.equal(
      parseStudioImportProgress({
        status: 'analyzing',
        stage: 'comparing',
        current: 0,
        total: 0,
        createdAt: 'now',
        updatedAt: 'now',
        attempts: 1,
        workerAvailable: true,
        events: [{ kind: 'worker-log', progress: 140 }]
      }),
      undefined
    )
  })

  it('explains a large first-screen study without inventing an ETA', () => {
    const progress = parseStudioImportProgress({
      status: 'analyzing',
      message: 'Checking the first screen on computer and phone',
      stage: 'checking_pages',
      current: 0,
      total: 50,
      createdAt: '2026-07-20T12:00:00.000Z',
      updatedAt: '2026-07-20T12:00:30.000Z',
      attempts: 1,
      workerAvailable: true,
      events: []
    })

    assert.ok(progress)
    assert.equal(
      studioProgressGuidance(progress, 90_000),
      'The first screen is checked on computer and phone. The other 49 pages will follow.'
    )
  })

  it('reports a delayed queue only before active creation begins', () => {
    const queued = parseStudioImportProgress({
      status: 'queued',
      stage: 'queued',
      current: 0,
      total: 0,
      createdAt: '2026-07-20T12:00:00.000Z',
      updatedAt: '2026-07-20T12:00:00.000Z',
      attempts: 0,
      workerAvailable: false,
      events: []
    })
    const active = queued ? { ...queued, status: 'analyzing' as const } : undefined

    assert.ok(queued)
    assert.ok(active)
    assert.equal(studioQueueIsDelayed(queued, Date.parse('2026-07-20T12:00:16.000Z')), true)
    assert.equal(studioQueueIsDelayed(active, Date.parse('2026-07-20T12:05:00.000Z')), false)
  })

  it('keeps computer and phone previews stable while preserving the full phone image', () => {
    const progress = parseStudioImportProgress({
      status: 'analyzing',
      stage: 'checking_pages',
      current: 0,
      total: 2,
      createdAt: '2026-07-20T12:00:00.000Z',
      updatedAt: '2026-07-20T12:00:30.000Z',
      attempts: 1,
      workerAvailable: true,
      events: [
        {
          id: 'mobile',
          key: 'capture-mobile',
          kind: 'capture',
          title: 'Phone view captured',
          progress: 34,
          artifactKind: 'mobile',
          artifactUrl: 'https://example.com/mobile.jpg',
          createdAt: '2026-07-20T12:00:20.000Z'
        },
        {
          id: 'desktop',
          key: 'capture-desktop',
          kind: 'capture',
          title: 'Computer view captured',
          progress: 28,
          artifactKind: 'desktop',
          artifactUrl: 'https://example.com/desktop.jpg',
          createdAt: '2026-07-20T12:00:10.000Z'
        }
      ]
    })

    assert.ok(progress)
    const html = renderToStaticMarkup(
      React.createElement(StudioProgressCaptures, { events: progress.events, pending: true })
    )
    assert.ok(html.indexOf('Computer view') < html.indexOf('Phone view'))
    assert.match(html, /object-contain object-top/)
    assert.match(html, /Ready/)
  })
})
