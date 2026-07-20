import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  parseStudioIterationProgress,
  studioIterationGuidance,
  studioIterationIsDelayed,
  studioIterationStepIndex
} from '../lib/studio-iteration-progress'

const queuedRow = {
  created_at: '2026-07-21T09:00:00.000Z',
  progress_current: 0,
  progress_message: 'Your change is safely waiting',
  progress_stage: 'queued',
  progress_total: 5,
  progress_updated_at: '2026-07-21T09:00:00.000Z',
  status: 'queued'
}

describe('Studio iteration progress', () => {
  it('accepts only bounded owner-facing progress rows', () => {
    const progress = parseStudioIterationProgress(queuedRow)
    assert.ok(progress)
    assert.equal(progress.stage, 'queued')
    assert.equal(progress.total, 5)
    assert.equal(
      parseStudioIterationProgress({
        ...queuedRow,
        progress_stage: 'raw_model_reasoning'
      }),
      undefined
    )
  })

  it('moves through the five visible milestones without inventing time percentages', () => {
    const stages = [
      ['queued', 0],
      ['starting', 1],
      ['comparing', 2],
      ['checking_pages', 3],
      ['saving', 4],
      ['completed', 5]
    ]
    for (const [stage, expectedIndex] of stages) {
      const progress = parseStudioIterationProgress({
        ...queuedRow,
        progress_stage: stage,
        status: stage === 'completed' ? 'completed' : 'working'
      })
      assert.ok(progress)
      assert.equal(studioIterationStepIndex(progress), expectedIndex)
    }
  })

  it('explains selected elements, reference files, retries, and delayed queues plainly', () => {
    const starting = parseStudioIterationProgress({
      ...queuedRow,
      progress_current: 1,
      progress_stage: 'starting',
      status: 'working'
    })
    const retrying = parseStudioIterationProgress({
      ...queuedRow,
      progress_stage: 'retrying',
      status: 'working'
    })
    assert.ok(starting)
    assert.ok(retrying)
    assert.match(
      studioIterationGuidance(
        starting,
        { attachmentCount: 0, selectionLabel: 'Hero image' },
        false
      ),
      /focusing on “Hero image”/
    )
    assert.match(
      studioIterationGuidance(starting, { attachmentCount: 2 }, false),
      /2 reference files/
    )
    assert.match(studioIterationGuidance(retrying, { attachmentCount: 0 }, false), /automatically/)
    assert.equal(
      studioIterationIsDelayed(
        parseStudioIterationProgress(queuedRow) ?? starting,
        new Date('2026-07-21T09:00:16.000Z').getTime()
      ),
      true
    )
  })
})
