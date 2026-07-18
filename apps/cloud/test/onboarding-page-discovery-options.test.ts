import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { OnboardingPageDiscoveryOptions } from '../components/onboarding-page-discovery-options'

Object.defineProperty(globalThis, 'React', { configurable: true, value: React })

const sharedProps = {
  loading: false,
  onDiscover: () => undefined,
  onImport: () => undefined
}

/** Count natively disabled controls in server-rendered method choices. */
function countDisabledControls(html: string): number {
  return html.match(/ disabled=""/g)?.length ?? 0
}

describe('onboarding page discovery choices', () => {
  it('explains why only automatic discovery is unavailable for secure access', () => {
    const html = renderToStaticMarkup(
      React.createElement(OnboardingPageDiscoveryOptions, {
        ...sharedProps,
        cloudDiscoveryBlocked: true,
        validSiteUrl: true
      })
    )

    assert.equal(countDisabledControls(html), 1)
    assert.match(html, /Automatic discovery is off because private or secure access was selected/)
    assert.match(html, /The file is read locally in this browser/)
  })

  it('enables both methods for a valid public website address', () => {
    const html = renderToStaticMarkup(
      React.createElement(OnboardingPageDiscoveryOptions, {
        ...sharedProps,
        cloudDiscoveryBlocked: false,
        validSiteUrl: true
      })
    )

    assert.equal(countDisabledControls(html), 0)
    assert.match(html, /Scan sitemap &amp; homepage/)
    assert.match(html, /After import, review the paths below/)
  })

  it('keeps both methods unavailable until an HTTPS address can scope the results', () => {
    const html = renderToStaticMarkup(
      React.createElement(OnboardingPageDiscoveryOptions, {
        ...sharedProps,
        cloudDiscoveryBlocked: false,
        validSiteUrl: false
      })
    )

    assert.equal(countDisabledControls(html), 2)
    assert.match(html, /Enter a valid HTTPS website address/)
    assert.match(html, /URLs can be limited to this site/)
  })
})
