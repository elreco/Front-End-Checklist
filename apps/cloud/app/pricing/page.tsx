import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { JsonLd } from '@/components/json-ld'
import { PricingCards } from '@/components/pricing-cards'
import { LOCALIZED_PRICING, type PricingCurrency, pricingCurrencyFromHeaders } from '@/lib/pricing'
import { absoluteUrl, createPublicMetadata, SITE_NAME, SITE_URL } from '@/lib/seo'
import { parsePricingUpgradeContext } from '@/lib/upgrade'

export const metadata: Metadata = createPublicMetadata({
  title: 'Pricing',
  description:
    'Compare CodeRocket website monitoring plans for owners, freelancers, and agencies. Start free with no credit card.',
  path: '/pricing',
  image: '/pricing/opengraph-image',
  keywords: ['website monitoring pricing', 'frontend monitoring plans', 'website health checker']
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
      'Website health monitoring for availability, search visibility, accessibility, speed, security, and frontend quality.',
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
        name: 'Personal',
        price: String(pricing.personal),
        priceCurrency: currency,
        url: absoluteUrl('/pricing'),
        availability: 'https://schema.org/InStock'
      },
      {
        '@type': 'Offer',
        name: 'Agency',
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
  const upgradeContext = parsePricingUpgradeContext(await searchParams)
  return (
    <main className="px-5 py-20">
      <JsonLd data={createPricingStructuredData(currency)} />
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-16 max-w-4xl text-center">
          <p className="font-mono text-muted text-xs uppercase tracking-[.2em]">
            — &nbsp; Pricing &nbsp; —
          </p>
          <h1 className="mt-6 font-editorial text-6xl tracking-[-.03em] sm:text-7xl">
            Start with one website. Grow to fifty.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
            Every plan combines verified website checks with grounded fix guidance. AI usage is
            included and metered transparently; it never changes a website, closes a problem, or
            replaces the fresh check that confirms a fix.
          </p>
        </div>
        <PricingCards currency={currency} {...upgradeContext} />
        <p className="mt-8 text-center font-mono text-muted text-xs">
          Prices shown in {currency} based on your location · Stripe confirms the billing currency
          and calculates applicable tax at checkout
        </p>
      </div>
    </main>
  )
}
