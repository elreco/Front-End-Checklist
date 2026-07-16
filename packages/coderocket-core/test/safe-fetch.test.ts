import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { assertPublicHttpsUrl, fetchPublicHtml } from '../src/index'

describe('safe HTML fetch', () => {
  it('blocks private IPv4 and loopback IPv6', async () => {
    await assert.rejects(() => assertPublicHttpsUrl('https://127.0.0.1'), /Private or reserved/)
    await assert.rejects(() => assertPublicHttpsUrl('https://[::1]'), /Private or reserved/)
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
})
