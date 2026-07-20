import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createSiteDocument, type SiteSourceBlueprint } from '@coderocket/core'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SiteDocumentPreview } from '../components/site-document-preview'

Reflect.set(globalThis, 'React', React)

const searchPage: SiteSourceBlueprint = {
  accentColor: '#1a73e8',
  backgroundColor: '#ffffff',
  brandName: 'Example',
  capturedAt: '2026-07-20T20:00:00.000Z',
  description: 'This metadata must not become visible copy.',
  footerLinks: [{ href: '/privacy', label: 'Privacy' }],
  foregroundColor: '#202124',
  headerBrandVisible: false,
  navigation: [{ href: '/login', label: 'Sign in', prominent: true }],
  sections: [
    {
      backgroundColor: '#ffffff',
      body: '',
      foregroundColor: '#202124',
      form: {
        action: '/search',
        controls: [
          { kind: 'input', label: 'Search', name: 'q', type: 'search' },
          { kind: 'button', label: 'Search', name: 'submit', value: 'Search' }
        ],
        method: 'get',
        style: {
          buttonBackgroundColor: '#f1f3f4',
          buttonBorderColor: '#dadce0',
          buttonForegroundColor: '#202124',
          buttonHeight: 36,
          buttonRadius: 4,
          gap: 8,
          inputBackgroundColor: '#ffffff',
          inputBorderColor: '#9aa0a6',
          inputForegroundColor: '#202124',
          inputHeight: 44,
          inputRadius: 8,
          inputWidth: 640,
          mobileInputWidth: 342
        }
      },
      heading: '',
      imageAlt: 'Example',
      imageMobileWidth: 180,
      imageUrl: 'https://example.com/logo.png',
      imageWidth: 272,
      layout: 'stacked',
      links: []
    }
  ],
  sourceUrl: 'https://example.com/',
  title: 'Example'
}

describe('captured website rendering', () => {
  it('renders measured media and native controls without an invented heading or description', () => {
    const document = createSiteDocument(searchPage, 'owned')
    const html = renderToStaticMarkup(
      React.createElement(SiteDocumentPreview, { document, published: false })
    )

    assert.match(html, /aria-label="Search"/)
    assert.match(html, /name="q"/)
    assert.match(html, /clamp\(180px, 18\.89cqw, 272px\)/)
    assert.match(html, />Sign in</)
    assert.match(html, />Privacy</)
    assert.doesNotMatch(html, /This metadata must not become visible copy/)
    assert.doesNotMatch(html, /data-cr-select-kind="brand"/)
  })
})
