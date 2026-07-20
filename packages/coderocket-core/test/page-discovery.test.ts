import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { discoverPublicPagePaths, discoverRenderedPagePaths } from '../src/page-discovery'
import type { SafeHtmlResponse, SafeTextResponse } from '../src/safe-fetch'

function htmlResponse(url: string, html: string): SafeHtmlResponse {
  return {
    durationMs: 10,
    fetchedAt: new Date(0).toISOString(),
    headers: { 'content-type': 'text/html' },
    html,
    status: 200,
    url
  }
}

function textResponse(url: string, text: string): SafeTextResponse {
  return {
    durationMs: 10,
    fetchedAt: new Date(0).toISOString(),
    headers: { 'content-type': 'application/xml' },
    status: 200,
    text,
    url
  }
}

describe('public page discovery', () => {
  it('combines same-origin sitemap pages and homepage links', async () => {
    const result = await discoverPublicPagePaths('https://example.com', {
      fetchHtml: async url =>
        htmlResponse(
          url,
          '<a href="/pricing">Pricing</a><a href="https://other.example/docs">Other</a>'
        ),
      fetchText: async url => {
        if (url.endsWith('/robots.txt'))
          return textResponse(url, 'Sitemap: https://example.com/pages.xml')
        return textResponse(
          url,
          '<urlset><url><loc>https://example.com/</loc></url><url><loc>https://example.com/contact</loc></url></urlset>'
        )
      }
    })

    assert.deepEqual(result.pages, [
      { path: '/', source: 'sitemap' },
      { path: '/pricing', source: 'homepage' },
      { path: '/contact', source: 'sitemap' }
    ])
    assert.equal(result.sitemapCount, 1)
  })

  it('follows a bounded same-origin sitemap index and ignores assets', async () => {
    const result = await discoverPublicPagePaths('https://example.com', {
      fetchHtml: async url => htmlResponse(url, '<a href="/app.js">Asset</a>'),
      fetchText: async url => {
        if (url.endsWith('/robots.txt')) throw new Error('HTTP 404')
        if (url.endsWith('/sitemap.xml'))
          return textResponse(
            url,
            '<sitemapindex><sitemap><loc>https://example.com/nested.xml</loc></sitemap><sitemap><loc>https://outside.example/map.xml</loc></sitemap></sitemapindex>'
          )
        return textResponse(
          url,
          '<urlset><url><loc>https://example.com/docs/start</loc></url><url><loc>https://example.com/file.pdf</loc></url></urlset>'
        )
      }
    })

    assert.deepEqual(result.pages, [
      { path: '/', source: 'homepage' },
      { path: '/docs/start', source: 'sitemap' }
    ])
    assert.equal(result.sitemapCount, 2)
  })

  it('still uses a sitemap when the homepage cannot be opened', async () => {
    const result = await discoverPublicPagePaths('https://example.com', {
      fetchHtml: async () => {
        throw new Error('The site returned a Cloudflare challenge instead of the page')
      },
      fetchText: async url =>
        url.endsWith('/robots.txt')
          ? textResponse(url, '')
          : textResponse(url, '<urlset><url><loc>https://example.com/public</loc></url></urlset>')
    })

    assert.deepEqual(result.pages, [{ path: '/public', source: 'sitemap' }])
    assert.equal(result.usedHomepage, false)
  })
})

describe('authorised app page discovery', () => {
  it('keeps same-origin screens and ignores sign-out or destructive links', () => {
    const paths = discoverRenderedPagePaths(
      [
        '<a href="/dashboard">Dashboard</a>',
        '<a href="/projects/alpha">Project</a>',
        '<a href="/settings?tab=billing">Settings</a>',
        '<a href="/logout">Sign out</a>',
        '<a href="/projects/alpha/delete">Delete</a>',
        '<a href="https://other.example/private">Other</a>'
      ].join(''),
      'https://app.example.com/dashboard'
    )

    assert.deepEqual(paths, ['/dashboard', '/projects/alpha', '/settings'])
  })

  it('bounds the number of private routes returned', () => {
    const html = Array.from(
      { length: 20 },
      (_, index) => `<a href="/screen-${index}">Page</a>`
    ).join('')
    assert.equal(discoverRenderedPagePaths(html, 'https://app.example.com/start', 4).length, 4)
  })
})
