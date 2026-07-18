import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SiteVisual } from '../components/site-visual'

Object.defineProperty(globalThis, 'React', { configurable: true, value: React })

describe('site visual', () => {
  it('explains the fallback when no preview image was discovered', () => {
    const html = renderToStaticMarkup(
      React.createElement(SiteVisual, {
        name: 'Example Studio',
        size: 'detail'
      })
    )

    assert.match(html, /No preview image found/)
    assert.match(html, />ES</)
  })

  it('prioritizes an above-the-fold detail preview with stable dimensions', () => {
    const html = renderToStaticMarkup(
      React.createElement(SiteVisual, {
        imageUrl: 'https://example.com/preview.png',
        name: 'Example Studio',
        size: 'detail'
      })
    )

    assert.match(html, /fetchPriority="high"/)
    assert.match(html, /height="96"/)
    assert.match(html, /loading="eager"/)
    assert.match(html, /role="presentation"/)
    assert.match(html, /width="160"/)
  })
})
