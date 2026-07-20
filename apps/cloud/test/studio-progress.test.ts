import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  parseStudioImportProgress,
  studioProgressPercent
} from '../app/studio/[siteId]/studio-progress-model'

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
})
