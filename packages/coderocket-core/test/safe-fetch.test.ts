import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { assertPublicHttpsUrl, fetchPublicHtml, fetchPublicText } from '../src/index'

describe('safe HTML fetch', () => {
  it('blocks private IPv4 and loopback IPv6', async () => {
    await assert.rejects(() => assertPublicHttpsUrl('https://127.0.0.1'), /Private or reserved/)
    await assert.rejects(() => assertPublicHttpsUrl('https://[::1]'), /Private or reserved/)
  })

  it('blocks documentation ranges, IPv4-mapped loopback, and obsolete transition ranges', async () => {
    await assert.rejects(() => assertPublicHttpsUrl('https://192.0.2.1'), /Private or reserved/)
    await assert.rejects(() => assertPublicHttpsUrl('https://198.51.100.1'), /Private or reserved/)
    await assert.rejects(() => assertPublicHttpsUrl('https://203.0.113.1'), /Private or reserved/)
    await assert.rejects(
      () => assertPublicHttpsUrl('https://[::ffff:127.0.0.1]'),
      /Private or reserved/
    )
    await assert.rejects(
      () => assertPublicHttpsUrl('https://[2002:7f00:1::]'),
      /Private or reserved/
    )
  })

  it('blocks non-HTTPS URLs', async () => {
    await assert.rejects(() => assertPublicHttpsUrl('http://93.184.216.34'), /HTTPS/)
  })

  it('validates every redirect destination', async () => {
    const fakeFetch = async () =>
      new Response(null, { status: 302, headers: { location: 'https://127.0.0.1/admin' } })
    await assert.rejects(
      () => fetchPublicHtml('https://93.184.216.34', { fetchImplementation: fakeFetch }),
      /Private or reserved/
    )
  })

  it('rejects non-HTML responses', async () => {
    const fakeFetch = async () =>
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    await assert.rejects(
      () => fetchPublicHtml('https://93.184.216.34', { fetchImplementation: fakeFetch }),
      /not HTML/
    )
  })

  it('rejects empty HTML documents', async () => {
    const fakeFetch = async () =>
      new Response('   ', { status: 200, headers: { 'content-type': 'text/html' } })
    await assert.rejects(
      () => fetchPublicHtml('https://93.184.216.34', { fetchImplementation: fakeFetch }),
      /HTML response is empty/
    )
  })

  it('records response evidence used by website health checks', async () => {
    const fakeFetch = async () =>
      new Response('<!doctype html><title>Healthy page</title>', {
        status: 200,
        headers: {
          'content-type': 'text/html',
          'strict-transport-security': 'max-age=31536000'
        }
      })
    const response = await fetchPublicHtml('https://93.184.216.34', {
      fetchImplementation: fakeFetch
    })
    assert.equal(response.status, 200)
    assert.equal(response.headers['strict-transport-security'], 'max-age=31536000')
    assert.ok(response.durationMs >= 0)
  })

  it('reports Cloudflare challenges as an explicit operational result', async () => {
    const fakeFetch = async () =>
      new Response('<title>Just a moment...</title>', {
        status: 403,
        headers: { 'content-type': 'text/html', 'cf-mitigated': 'challenge' }
      })
    await assert.rejects(
      () => fetchPublicHtml('https://93.184.216.34', { fetchImplementation: fakeFetch }),
      /Cloudflare challenge/
    )
  })

  it('sends runner access headers only to the original origin', async () => {
    const received: Array<string | null> = []
    let requestCount = 0
    const fakeFetch: typeof fetch = async (_input, init) => {
      received.push(new Headers(init?.headers).get('authorization'))
      requestCount += 1
      if (requestCount === 1)
        return new Response(null, {
          status: 302,
          headers: { location: 'https://93.184.216.35/after-login' }
        })
      return new Response('<title>Private page</title>', {
        status: 200,
        headers: { 'content-type': 'text/html' }
      })
    }
    await fetchPublicHtml('https://93.184.216.34', {
      fetchImplementation: fakeFetch,
      headers: { authorization: 'Bearer private-test-token' }
    })
    assert.deepEqual(received, ['Bearer private-test-token', null])
  })

  it('rejects unsafe runner header overrides', async () => {
    const fakeFetch = async () =>
      new Response('<title>Page</title>', {
        status: 200,
        headers: { 'content-type': 'text/html' }
      })
    await assert.rejects(
      () =>
        fetchPublicHtml('https://93.184.216.34', {
          fetchImplementation: fakeFetch,
          headers: { host: 'private.example.com' }
        }),
      /not allowed/
    )
  })

  it('reads plain text resources with the same public-network controls', async () => {
    const fakeFetch = async () =>
      new Response('User-agent: *\nAllow: /', {
        status: 200,
        headers: { 'content-type': 'text/plain' }
      })
    const response = await fetchPublicText('https://93.184.216.34/robots.txt', {
      fetchImplementation: fakeFetch
    })
    assert.match(response.text, /User-agent/)
  })
})
