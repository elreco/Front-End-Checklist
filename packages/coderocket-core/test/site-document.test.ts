import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mergeResponsiveBlueprints } from '../src/site-blueprint-capture'
import {
  createSiteBundleDocument,
  createSiteDocument,
  getBuilderPlanEntitlements,
  type SiteSourceBlueprint
} from '../src/site-document'
import {
  applySiteVisualRefinement,
  type SiteSectionVisualStyle,
  type SiteVisualTheme
} from '../src/site-visual-style'

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

const visualStyle: SiteSectionVisualStyle = {
  desktop: {
    bodySize: 18,
    contentWidth: 1120,
    gap: 48,
    headingSize: 72,
    paddingBlock: 96,
    textAlign: 'left'
  },
  mobile: {
    bodySize: 16,
    contentWidth: 390,
    gap: 24,
    headingSize: 42,
    paddingBlock: 48,
    textAlign: 'left'
  },
  backgroundImage: '',
  bodyLineHeight: 1.6,
  borderColor: 'rgba(0, 0, 0, 0)',
  borderRadius: 16,
  borderWidth: 0,
  elevation: 'none',
  headingFontFamily: 'Georgia, serif',
  headingFontWeight: 600,
  headingLetterSpacing: -1,
  headingLineHeight: 0.95,
  imageAspectRatio: 1.33,
  imageFit: 'cover',
  imagePosition: 'after'
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

  it('keeps AI visual refinement inside style fields', () => {
    const visualTheme: SiteVisualTheme = {
      button: {
        backgroundColor: '#0c63f5',
        borderColor: '#0c63f5',
        foregroundColor: '#ffffff',
        radius: 20,
        style: 'solid'
      },
      fontFamily: 'Arial, sans-serif',
      header: {
        backgroundColor: '#ffffff',
        borderColor: '#dddddd',
        foregroundColor: '#111111',
        height: 72,
        position: 'sticky'
      },
      headingFontFamily: 'Georgia, serif'
    }
    const styledSource: SiteSourceBlueprint = {
      ...source,
      sections: [{ ...source.sections[0], visual: visualStyle }],
      visualTheme
    }
    const refined = applySiteVisualRefinement(styledSource, {
      confidence: 'high',
      limitations: [],
      theme: visualTheme,
      sections: [{ index: 0, layout: 'centered', style: visualStyle }]
    })
    const document = createSiteDocument(refined, 'owned')

    assert.equal(document.sections[0]?.heading, source.sections[0]?.heading)
    assert.equal(document.sections[0]?.layout, 'centered')
    assert.equal(document.sections[0]?.visual?.desktop.headingSize, 72)
    assert.equal(document.theme.visual?.button.foregroundColor, '#ffffff')
    assert.equal(document.recreation?.visualAnalysis, 'responsive-ai')
  })

  it('merges measured mobile geometry without changing desktop content', () => {
    const desktop: SiteSourceBlueprint = {
      ...source,
      sections: [{ ...source.sections[0], visual: visualStyle }]
    }
    const mobile: SiteSourceBlueprint = {
      ...desktop,
      sections: [
        {
          ...desktop.sections[0],
          visual: {
            ...visualStyle,
            mobile: {
              ...visualStyle.mobile,
              headingSize: 34,
              textAlign: 'center'
            }
          }
        }
      ]
    }
    const merged = mergeResponsiveBlueprints(desktop, desktop, mobile)

    assert.equal(merged.sections[0]?.heading, source.sections[0]?.heading)
    assert.equal(merged.sections[0]?.visual?.desktop.headingSize, 72)
    assert.equal(merged.sections[0]?.visual?.mobile.headingSize, 34)
    assert.equal(merged.sections[0]?.visual?.mobile.textAlign, 'center')
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
