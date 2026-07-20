import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createSiteBundleDocument,
  createSiteDocument,
  getBuilderPlanEntitlements,
  type SiteSourceBlueprint
} from '../src/site-document'

const source: SiteSourceBlueprint = {
  accentColor: 'rgb(12, 99, 245)',
  backgroundColor: 'rgb(255, 255, 255)',
  brandName: 'Northstar Studio',
  capturedAt: '2026-07-19T10:00:00.000Z',
  description: 'A thoughtful creative studio.',
  foregroundColor: 'rgb(20, 20, 25)',
  logoUrl: 'https://example.com/logo.svg',
  navigation: [{ href: '/work', label: 'Our work' }],
  sections: [
    {
      backgroundColor: 'rgb(255, 255, 255)',
      body: 'A thoughtful creative studio.',
      foregroundColor: 'rgb(20, 20, 25)',
      heading: 'Ideas that move people',
      imageUrl: 'https://example.com/hero.jpg',
      links: [{ href: '/contact', label: 'Talk to us' }]
    }
  ],
  sourceUrl: 'https://example.com/',
  title: 'Northstar Studio'
}

describe('site document', () => {
  it('keeps permitted content for an owned website', () => {
    const document = createSiteDocument(source, 'owned', 'contact')
    assert.equal(document.identity.name, 'Northstar Studio')
    assert.equal(document.sections[0]?.heading, 'Ideas that move people')
    assert.equal(document.sections[0]?.imageUrl, 'https://example.com/hero.jpg')
    assert.equal(document.navigation[0]?.href, 'https://example.com/work')
  })

  it('removes source identity and copy when used only as inspiration', () => {
    const document = createSiteDocument(source, 'inspiration', 'booking')
    assert.equal(document.identity.name, 'Your business')
    assert.equal(document.identity.logoUrl, undefined)
    assert.equal(document.sections[0]?.imageUrl, undefined)
    assert.doesNotMatch(document.sections[0]?.heading ?? '', /Ideas that move people/)
  })

  it('infers the initial action instead of asking a novice to configure it', () => {
    const document = createSiteDocument(
      {
        ...source,
        description: 'Book an appointment with our team.',
        title: 'Northstar appointments'
      },
      'inspiration'
    )
    assert.equal(document.sections[0]?.heading, 'Turn visits into confirmed appointments.')
  })

  it('gives free accounts no variable-cost builder entitlement', () => {
    assert.equal(getBuilderPlanEntitlements('free').sites, 0)
    assert.equal(getBuilderPlanEntitlements('free').variableCostBudgetMicroeur, 0)
    assert.ok(
      getBuilderPlanEntitlements('solo').variableCostBudgetMicroeur <
        getBuilderPlanEntitlements('agency').variableCostBudgetMicroeur
    )
  })

  it('bundles multiple captured pages with an honest coverage receipt', () => {
    const homepage = createSiteDocument(source, 'owned', 'contact')
    const bundle = createSiteBundleDocument(
      homepage,
      [
        { document: homepage, path: '/' },
        {
          document: createSiteDocument(
            {
              ...source,
              sections: [{ ...source.sections[0], heading: 'Contact Northstar' }],
              sourceUrl: 'https://example.com/contact'
            },
            'owned',
            'contact'
          ),
          path: '/contact'
        }
      ],
      3,
      ['/private']
    )
    assert.deepEqual(
      bundle.pages?.map(page => page.path),
      ['/', '/contact']
    )
    assert.deepEqual(bundle.importSummary, {
      capturedPages: 2,
      discoveredPages: 3,
      failedPaths: ['/private']
    })
  })
})
