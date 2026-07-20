import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { JsonLd } from '@/components/json-ld'
import { PricingCards } from '@/components/pricing-cards'
import { LOCALIZED_PRICING, type PricingCurrency, pricingCurrencyFromHeaders } from '@/lib/pricing'
import { absoluteUrl, createPublicMetadata, SITE_NAME, SITE_URL } from '@/lib/seo'
import { parsePricingUpgradeContext } from '@/lib/upgrade'
import { normalizeWebsiteDraft } from '@/lib/website-draft'

export const metadata: Metadata = createPublicMetadata({
  title: 'Pricing',
  description:
    'Compare CodeRocket website cloning, editing, hosting, and optional monitoring plans. Every paid plan has hard usage and cost limits.',
  path: '/pricing',
  image: '/pricing/opengraph-image',
  keywords: ['AI website builder pricing', 'website cloning pricing', 'no-code website hosting']
})

/** Build structured pricing data that matches the currency visible on the page. */
function createPricingStructuredData(currency: PricingCurrency) {
  const pricing = LOCALIZED_PRICING[currency]
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/#software`,
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'No-code website cloning, editing, and controlled hosting with optional health tools for existing sites.',
    offers: [
      {
        '@type': 'Offer',
        name: 'Free',
        price: '0',
        priceCurrency: currency,
        url: absoluteUrl('/pricing'),
        availability: 'https://schema.org/InStock'
      },
      {
        '@type': 'Offer',
        name: 'Launch',
        price: String(pricing.personal),
        priceCurrency: currency,
        url: absoluteUrl('/pricing'),
        availability: 'https://schema.org/InStock'
      },
      {
        '@type': 'Offer',
        name: 'Studio',
        price: String(pricing.agency),
        priceCurrency: currency,
        url: absoluteUrl('/pricing'),
        availability: 'https://schema.org/InStock'
      }
    ]
  }
}

export default async function PricingPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const currency = pricingCurrencyFromHeaders(await headers())
  const query = await searchParams
  const upgradeContext = parsePricingUpgradeContext(query)
  const rawWebsite = Array.isArray(query.url) ? query.url[0] : query.url
  const websiteDraft = normalizeWebsiteDraft(rawWebsite ?? '') ?? undefined
  return (
    <main className="px-5 py-20">
      <JsonLd data={createPricingStructuredData(currency)} />
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-16 max-w-4xl text-center">
          <p className="font-mono text-muted text-xs uppercase tracking-[.2em]">
            — &nbsp; Pricing &nbsp; —
          </p>
          <h1 className="mt-6 font-editorial text-6xl tracking-[-.03em] sm:text-7xl">
            One clear price.
            <br />
            No runaway AI bill.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
            Website cloning and hosting have hard monthly limits before work starts. CodeRocket
            pauses at the included ceiling instead of charging an automatic overage. Optional
            website checks remain available on every plan.
          </p>
        </div>
        <PricingCards currency={currency} websiteDraft={websiteDraft} {...upgradeContext} />
        <div className="mt-8 grid gap-px border border-border bg-border sm:grid-cols-3">
          {[
            [
              'Cost reserved first',
              'Every paid generation reserves provider budget before it enters the queue.'
            ],
            [
              'No automatic overage',
              'Creation and hosting stop at their included ceilings unless you explicitly choose more.'
            ],
            [
              'Existing sites stay safe',
              'Reaching a creation limit never deletes a version or silently changes a published site.'
            ]
          ].map(([title, detail]) => (
            <div className="bg-surface p-5" key={title}>
              <p className="font-heading font-semibold">{title}</p>
              <p className="mt-2 text-muted text-sm leading-6">{detail}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center font-mono text-muted text-xs">
          Prices shown in {currency} based on your location · Stripe confirms the billing currency
          and calculates applicable tax at checkout
        </p>
      </div>
    </main>
  )
}
