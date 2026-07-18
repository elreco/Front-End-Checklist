import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createDocumentProof } from '../src/document-proof'

describe('document proof', () => {
  it('records an exact hash and a bounded structural outline', () => {
    const html = `<!doctype html>
      <html lang="en">
        <head>
          <title>Dashboard — user@example.com</title>
          <meta name="description" content="Private account data">
          <link rel="stylesheet" href="/app.css?token=secret">
          <script>window.secret = "do not retain"</script>
        </head>
        <body class="account user-123"><main><h1>Welcome Alex</h1></main></body>
      </html>`
    const proof = createDocumentProof({
      fetchedAt: '2026-07-18T10:00:00.000Z',
      headers: {
        age: '42',
        'cf-cache-status': 'HIT',
        'content-type': 'text/html; charset=utf-8',
        etag: '"document-v2"'
      },
      html
    })

    assert.equal(proof.byteLength, new TextEncoder().encode(html).byteLength)
    assert.match(proof.sha256, /^[a-f0-9]{64}$/)
    assert.equal(proof.title, 'Dashboard — [email]')
    assert.equal(proof.contentType, 'text/html')
    assert.equal(proof.cacheStatus, 'Cloudflare: HIT · Age: 42s')
    assert.match(proof.htmlOutline, /<html lang="en">/)
    assert.match(proof.htmlOutline, /<title>Dashboard — \[email\]<\/title>/)
    assert.match(proof.htmlOutline, /href="\/app\.css"/)
    assert.doesNotMatch(
      proof.htmlOutline,
      /Private account data|Welcome Alex|window\.secret|user-123/
    )
  })

  it('truncates very large documents without retaining script content', () => {
    const html = `<html><head><script>${'secret'.repeat(2000)}</script></head><body>${'<div>'.repeat(
      100
    )}</body></html>`
    const proof = createDocumentProof({
      fetchedAt: '2026-07-18T10:00:00.000Z',
      headers: {},
      html
    })

    assert.ok(proof.htmlOutline.length <= 6030)
    assert.match(proof.htmlOutline, /outline truncated/)
    assert.doesNotMatch(proof.htmlOutline, /secret/)
  })
})
