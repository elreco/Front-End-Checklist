import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  extractSiteImageUrls,
  extractSocialImageUrl,
  resolveProjectSocialImage
} from '../src/social-metadata'

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

  it('orders social images before Apple icons, favicons, and the conventional favicon', () => {
    const html = `
      <meta property="og:image" content="/share.png">
      <meta name="twitter:image" content="/x-card.png">
      <link rel="icon" href="/icon.svg">
      <link rel="apple-touch-icon" href="/apple.png">
    `
    assert.deepEqual(extractSiteImageUrls(html, 'https://example.com/products'), [
      'https://example.com/share.png',
      'https://example.com/x-card.png',
      'https://example.com/apple.png',
      'https://example.com/icon.svg',
      'https://example.com/favicon.ico'
    ])
  })

  it('adds the conventional favicon when no preview metadata is declared', () => {
    assert.deepEqual(extractSiteImageUrls('<title>Example</title>', 'https://example.com'), [
      'https://example.com/favicon.ico'
    ])
  })

  it('reserves the final candidate for the conventional favicon', () => {
    const metadata = Array.from(
      { length: 15 },
      (_, index) => `<meta property="og:image" content="/share-${index}.png">`
    ).join('')
    const urls = extractSiteImageUrls(metadata, 'https://example.com')

    assert.equal(urls.length, 12)
    assert.equal(urls.at(-1), 'https://example.com/favicon.ico')
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
    const missingImageFetch: typeof fetch = async () =>
      new Response('', { status: 404, headers: { 'content-type': 'text/html' } })
    assert.equal(
      await resolveProjectSocialImage(
        [{ url: 'https://example.com/', reachable: true, socialImageUrl: undefined }],
        { fetchImplementation: missingImageFetch }
      ),
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

  it('tries later metadata candidates when the preferred image is broken', async () => {
    const requestedUrls: string[] = []
    const imageFetch: typeof fetch = async input => {
      const url = String(input)
      requestedUrls.push(url)
      return url.endsWith('/working.png')
        ? new Response('', { status: 200, headers: { 'content-type': 'image/png' } })
        : new Response('', { status: 404, headers: { 'content-type': 'text/html' } })
    }

    assert.equal(
      await resolveProjectSocialImage(
        [
          {
            url: 'https://example.com/',
            reachable: true,
            siteImageUrls: [
              'https://example.com/broken.png',
              'https://example.com/working.png',
              'https://example.com/favicon.ico'
            ]
          }
        ],
        { fetchImplementation: imageFetch }
      ),
      'https://example.com/working.png'
    )
    assert.deepEqual(requestedUrls, [
      'https://example.com/broken.png',
      'https://example.com/working.png'
    ])
  })
})
