import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatStudioAttachmentSize,
  safeStudioAttachmentName,
  validateStudioAttachment
} from '../lib/studio-attachments'

describe('studio prompt attachments', () => {
  it('accepts a bounded image and keeps the canonical content type', () => {
    const result = validateStudioAttachment({
      name: 'new-product.webp',
      size: 420_000,
      type: 'image/webp'
    })

    assert.deepEqual(result.attachment, { extension: 'webp', mimeType: 'image/webp' })
    assert.equal(result.error, undefined)
  })

  it('rejects misleading, empty, and oversized references', () => {
    assert.match(
      validateStudioAttachment({
        name: 'reference.pdf',
        size: 20_000,
        type: 'text/html'
      }).error ?? '',
      /do not match/
    )
    assert.match(
      validateStudioAttachment({ name: 'empty.txt', size: 0, type: 'text/plain' }).error ?? '',
      /empty/
    )
    assert.match(
      validateStudioAttachment({
        name: 'huge.png',
        size: 6 * 1024 * 1024,
        type: 'image/png'
      }).error ?? '',
      /5 MB/
    )
  })

  it('shows readable names and sizes without accepting path fragments', () => {
    assert.equal(safeStudioAttachmentName('../folder/price-list.csv'), 'price-list.csv')
    assert.equal(formatStudioAttachmentSize(1_572_864), '1.5 MB')
  })
})
