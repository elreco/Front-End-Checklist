import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mergeResponsiveBlueprints } from '../src/site-blueprint-capture'
import { applyPublicSiteConnection, removePublicSiteConnection } from '../src/site-connection'
import {
  BUILDER_CREDIT_COSTS,
  createSiteBundleDocument,
  createSiteDocument,
  getBuilderPlanEntitlements,
  type SiteSourceBlueprint,
  selectSiteDocumentPage
} from '../src/site-document'
import { applySiteEditPlan, siteEditPlanSchema, siteEditSelectionSchema } from '../src/site-edit'
import { pageTemplate, selectRepresentativePageTargets } from '../src/site-page-selection'
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

  it('keeps repeated visible cards as one structured collection', () => {
    const document = createSiteDocument(
      {
        ...source,
        sections: [
          {
            ...source.sections[0],
            items: [
              {
                body: 'A lightweight everyday shoe.',
                imageUrl: 'https://example.com/shoe-one.jpg',
                links: [{ href: '/products/shoe-one', label: 'View shoe' }],
                price: '€120',
                title: 'Everyday One'
              },
              {
                body: 'A responsive running shoe.',
                imageUrl: 'https://example.com/shoe-two.jpg',
                links: [{ href: '/products/shoe-two', label: 'View shoe' }],
                price: '€140',
                title: 'Runner Two'
              }
            ]
          }
        ]
      },
      'owned'
    )

    assert.equal(document.sections[0]?.kind, 'hero')
    assert.equal(document.sections[0]?.items?.length, 2)
    assert.equal(document.sections[0]?.items?.[0]?.price, '€120')
    assert.equal(
      document.sections[0]?.items?.[0]?.links[0]?.href,
      'https://example.com/products/shoe-one'
    )
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
    assert.equal(getBuilderPlanEntitlements('solo').creationCreditsPerMonth, 100)
    assert.equal(getBuilderPlanEntitlements('agency').creationCreditsPerMonth, 600)
    assert.equal(BUILDER_CREDIT_COSTS.firstVersion, 20)
    assert.equal(BUILDER_CREDIT_COSTS.quickEdit, 0)
  })

  it('selects representative page types instead of every repeated URL', () => {
    const targets = selectRepresentativePageTargets(
      'https://example.com/',
      [
        '/products',
        '/products/shoe-one',
        '/products/shoe-two',
        '/products/shoe-three',
        '/about',
        '/contact',
        '/checkout',
        '/assets/logo.svg'
      ],
      5
    )

    assert.deepEqual(
      targets.map(target => target.path),
      ['/', '/contact', '/products', '/products/shoe-one', '/about']
    )
    assert.equal(pageTemplate('/fr/w/hommes-chaussures'), 'catalog')
    assert.equal(pageTemplate('/fr/t/air-max-123'), 'catalog-detail')
  })

  it('keeps useful account screens only for an authorised app import', () => {
    const publicTargets = selectRepresentativePageTargets(
      'https://app.example.com/dashboard',
      ['/account', '/settings', '/login'],
      5
    )
    const privateTargets = selectRepresentativePageTargets(
      'https://app.example.com/dashboard',
      ['/account', '/settings', '/login'],
      5,
      true
    )

    assert.deepEqual(
      publicTargets.map(target => target.path),
      ['/dashboard', '/settings']
    )
    assert.deepEqual(
      privateTargets.map(target => target.path),
      ['/dashboard', '/account', '/settings']
    )
  })

  it('bundles multiple captured pages with an honest coverage receipt', () => {
    const homepage = createSiteDocument(source, 'owned', 'contact')
    const contactDocument = createSiteDocument(
      {
        ...source,
        brandName: 'Northstar Contact',
        sections: [{ ...source.sections[0], heading: 'Contact Northstar' }],
        sourceUrl: 'https://example.com/contact',
        visualTheme: {
          button: {
            backgroundColor: '#111111',
            borderColor: '#111111',
            foregroundColor: '#ffffff',
            radius: 8,
            style: 'solid'
          },
          fontFamily: 'Inter, sans-serif',
          header: {
            backgroundColor: '#f8f8f8',
            borderColor: '#dddddd',
            foregroundColor: '#111111',
            height: 72,
            position: 'sticky'
          },
          headingFontFamily: 'Inter, sans-serif'
        }
      },
      'owned',
      'contact'
    )
    const bundle = createSiteBundleDocument(
      homepage,
      [
        { document: homepage, path: '/' },
        {
          document: contactDocument,
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
    const selectedContact = selectSiteDocumentPage(bundle, '/contact')
    assert.equal(selectedContact?.identity.name, 'Northstar Contact')
    assert.equal(selectedContact?.theme.visual?.fontFamily, 'Inter, sans-serif')
    assert.equal(selectedContact?.sections[0]?.heading, 'Contact Northstar')
  })

  it('applies one bounded no-code edit without changing the captured source receipt', () => {
    const document = createSiteDocument(source, 'owned', 'contact')
    const edited = applySiteEditPlan(document, {
      operations: [
        {
          body: 'A clearer introduction for the people we want to reach.',
          pagePath: '/',
          sectionId: document.sections[0]?.id ?? 'hero',
          type: 'update_section'
        },
        {
          backgroundColor: '#10141d',
          body: 'Everything a prospective customer needs before getting in touch.',
          foregroundColor: '#ffffff',
          heading: 'How we can help',
          kind: 'features',
          layout: 'stacked',
          pagePath: '/',
          type: 'add_section'
        }
      ],
      response: 'The introduction is clearer and a benefits section is ready to review.',
      summary: 'Clarified the homepage'
    })

    assert.equal(
      edited.sections[0]?.body,
      'A clearer introduction for the people we want to reach.'
    )
    assert.equal(edited.sections[1]?.heading, 'How we can help')
    assert.equal(edited.source.url, document.source.url)
    assert.equal(document.sections.length, 1)
  })

  it('rejects insecure destinations before an assistant plan can change a website', () => {
    assert.equal(
      siteEditPlanSchema.safeParse({
        operations: [
          {
            actionLabel: 'Pay now',
            actionUrl: 'http://example.com/pay',
            pagePath: '/',
            sectionId: 'hero',
            type: 'update_section'
          }
        ],
        response: 'Updated the payment action.',
        summary: 'Payment action'
      }).success,
      false
    )
  })

  it('accepts only a real uploaded-file id as planned image context', () => {
    const valid = siteEditPlanSchema.safeParse({
      operations: [
        {
          attachmentId: '6efac071-1520-465d-a6b7-c896005162cd',
          imageAlt: 'The new product on a white background',
          pagePath: '/',
          sectionId: 'hero',
          type: 'update_section'
        }
      ],
      response: 'The attached product image is ready to place.',
      summary: 'Updated the hero image'
    })
    const invalid = siteEditPlanSchema.safeParse({
      operations: [
        {
          attachmentId: '../../another-file',
          pagePath: '/',
          sectionId: 'hero',
          type: 'update_section'
        }
      ],
      response: 'Updated the image.',
      summary: 'Updated the image'
    })

    assert.equal(valid.success, true)
    assert.equal(invalid.success, false)
  })

  it('keeps selected preview context bounded and updates only the chosen collection item', () => {
    const document = createSiteDocument(
      {
        ...source,
        sections: [
          {
            ...source.sections[0],
            items: [
              { body: 'A daily shoe.', links: [], title: 'Everyday One' },
              { body: 'A running shoe.', links: [], price: '€140', title: 'Runner Two' }
            ]
          }
        ]
      },
      'owned'
    )
    const selection = siteEditSelectionSchema.parse({
      itemId: document.sections[0]?.items?.[1]?.id,
      kind: 'collection_item',
      label: 'Runner Two',
      pagePath: '/',
      sectionId: document.sections[0]?.id
    })
    const edited = applySiteEditPlan(document, {
      operations: [
        {
          itemId: selection.itemId ?? '',
          pagePath: '/',
          price: '€129',
          sectionId: document.sections[0]?.id ?? '',
          title: 'Runner Two — New edition',
          type: 'update_item'
        }
      ],
      response: 'The selected product card is updated.',
      summary: 'Updated one product card'
    })

    assert.equal(edited.sections[0]?.items?.[0]?.title, 'Everyday One')
    assert.equal(edited.sections[0]?.items?.[1]?.title, 'Runner Two — New edition')
    assert.equal(edited.sections[0]?.items?.[1]?.price, '€129')
  })

  it('adds a structured product from a prompt without replacing unrelated sections', () => {
    const document = createSiteDocument(source, 'owned')
    const edited = applySiteEditPlan(document, {
      operations: [
        {
          backgroundColor: '#ffffff',
          body: 'Browse the latest products.',
          foregroundColor: '#111111',
          heading: 'Shop',
          kind: 'collection',
          layout: 'stacked',
          pagePath: '/',
          sectionId: 'shop',
          type: 'add_section'
        },
        {
          body: 'Add the description, image, and payment action when they are ready.',
          pagePath: '/',
          sectionId: 'shop',
          title: 'New product',
          type: 'add_item'
        }
      ],
      response: 'A shop section and an editable first product are ready.',
      summary: 'Added a product'
    })

    assert.equal(edited.sections[0]?.heading, document.sections[0]?.heading)
    assert.equal(edited.sections[1]?.id, 'shop')
    assert.equal(edited.sections[1]?.items?.[0]?.title, 'New product')
    assert.equal(edited.sections[1]?.items?.[0]?.links.length, 0)
  })

  it('turns a prompt payment request into a safe setup operation without changing content', () => {
    const document = createSiteDocument(source, 'owned')
    const plan = siteEditPlanSchema.parse({
      operations: [
        {
          capability: 'payments',
          itemId: 'product-1',
          pagePath: '/',
          provider: 'stripe',
          sectionId: 'shop',
          type: 'request_connection'
        }
      ],
      response: 'Your shop is ready. Connect Stripe to finish payments.',
      summary: 'Prepared shop payments'
    })

    assert.deepEqual(applySiteEditPlan(document, plan), document)
  })

  it('adds a connected Stripe page to priced products without replacing unrelated links', () => {
    const document = createSiteDocument(
      {
        ...source,
        sections: [
          {
            ...source.sections[0],
            heading: 'Products',
            items: [
              { body: 'A simple product.', links: [], price: '€29', title: 'Starter kit' },
              {
                body: 'Read the details.',
                links: [{ href: 'https://example.com/details', label: 'Details' }],
                title: 'Guide'
              }
            ]
          }
        ]
      },
      'owned'
    )
    const result = applyPublicSiteConnection(document, {
      provider: 'stripe',
      url: 'https://buy.stripe.com/test_123'
    })

    assert.equal(result.document.sections[0]?.items?.[0]?.links[0]?.label, 'Buy now')
    assert.equal(
      result.document.sections[0]?.items?.[0]?.links[0]?.href,
      'https://buy.stripe.com/test_123'
    )
    assert.equal(
      result.document.sections[0]?.items?.[1]?.links[0]?.href,
      'https://example.com/details'
    )
    const removed = removePublicSiteConnection(result.document, 'https://buy.stripe.com/test_123')
    assert.equal(removed.document.sections[0]?.items?.[0]?.links.length, 0)
    assert.equal(
      removed.document.sections[0]?.items?.[1]?.links[0]?.href,
      'https://example.com/details'
    )
  })
})
