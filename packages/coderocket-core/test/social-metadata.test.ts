import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { extractSocialImageUrl, resolveProjectSocialImage } from '../src/social-metadata'

describe('social image metadata', () => {
  it('resolves relative Open Graph images against the final page URL', () => {
    const html = '<meta content="/assets/share.jpg?width=1200&amp;height=630" property="og:image">'
    assert.equal(
      extractSocialImageUrl(html, 'https://example.com/products/'),
      'https://example.com/assets/share.jpg?width=1200&height=630'
    )
  })

  it('prefers a secure Open Graph image regardless of attribute order', () => {
    const html = `
      <meta content="https://cdn.example.com/standard.jpg" property="og:image">
      <meta content='https://cdn.example.com/secure.jpg' property='og:image:secure_url'>
    `
    assert.equal(
      extractSocialImageUrl(html, 'https://example.com'),
      'https://cdn.example.com/secure.jpg'
    )
  })

  it('uses Twitter metadata as a fallback', () => {
    const html = '<meta name="twitter:image" content="https://cdn.example.com/social.png">'
    assert.equal(
      extractSocialImageUrl(html, 'https://example.com'),
      'https://cdn.example.com/social.png'
    )
  })

  it('ignores metadata-looking strings in scripts and comments', () => {
    const html = `
      <head>
        <!-- <meta property="og:image" content="https://cdn.example.com/comment.jpg"> -->
        <script>const template = '<meta property="og:image" content="https://cdn.example.com/script.jpg">';</script>
        <meta property="og:image" content="https://cdn.example.com/real.jpg">
      </head>
    `
    assert.equal(
      extractSocialImageUrl(html, 'https://example.com'),
      'https://cdn.example.com/real.jpg'
    )
  })

  it('rejects insecure, credentialed, and non-network image values', () => {
    const html = `
      <meta property="og:image" content="http://example.com/insecure.jpg">
      <meta property="og:image" content="https://user:secret@example.com/private.jpg">
      <meta name="twitter:image" content="data:image/png;base64,abc">
    `
    assert.equal(extractSocialImageUrl(html, 'https://example.com'), undefined)
  })

  it('clears stale images only after a reachable home-page check', async () => {
    const imageFetch: typeof fetch = async () =>
      new Response('', { status: 200, headers: { 'content-type': 'image/jpeg' } })
    assert.equal(
      await resolveProjectSocialImage([
        { url: 'https://93.184.216.34/', reachable: true, socialImageUrl: undefined }
      ]),
      null
    )
    assert.equal(
      await resolveProjectSocialImage(
        [
          {
            url: 'https://93.184.216.34/',
            reachable: false,
            socialImageUrl: 'https://93.184.216.34/social.jpg'
          }
        ],
        { fetchImplementation: imageFetch }
      ),
      undefined
    )
  })

  it('rebases a broken canonical image onto the audited deployment origin', async () => {
    const requestedUrls: string[] = []
    const imageFetch: typeof fetch = async input => {
      const url = String(input)
      requestedUrls.push(url)
      return url.startsWith('https://example.com/')
        ? new Response('', { status: 404, headers: { 'content-type': 'text/html' } })
        : new Response('', { status: 200, headers: { 'content-type': 'image/png' } })
    }

    assert.equal(
      await resolveProjectSocialImage(
        [
          {
            url: 'https://example.net/',
            reachable: true,
            socialImageUrl: 'https://example.com/images/share.png'
          }
        ],
        { fetchImplementation: imageFetch }
      ),
      'https://example.net/images/share.png'
    )
    assert.deepEqual(requestedUrls, [
      'https://example.com/images/share.png',
      'https://example.net/images/share.png'
    ])
  })
})
