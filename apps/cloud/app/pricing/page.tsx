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

const checkoutNotices: Record<string, { message: string; tone: 'danger' | 'muted' }> = {
  cancelled: {
    message: 'Checkout was closed. Nothing was charged and your current plan is unchanged.',
    tone: 'muted'
  },
  failed: {
    message: 'Stripe could not start checkout. Nothing was charged; please try again.',
    tone: 'danger'
  },
  invalid: {
    message: 'That plan is not available. Choose Launch or Studio below.',
    tone: 'danger'
  },
  unavailable: {
    message: 'Paid plans are temporarily unavailable. Free website checks still work normally.',
    tone: 'danger'
  }
}

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
        price: String(pricing.launch),
        priceCurrency: currency,
        url: absoluteUrl('/pricing'),
        availability: 'https://schema.org/InStock'
      },
      {
        '@type': 'Offer',
        name: 'Studio',
        price: String(pricing.studio),
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
  const rawCheckout = Array.isArray(query.checkout) ? query.checkout[0] : query.checkout
  const checkoutNotice = rawCheckout ? checkoutNotices[rawCheckout] : undefined
  return (
    <main className="px-5 py-20">
      <JsonLd data={createPricingStructuredData(currency)} />
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-16 max-w-4xl text-center">
          <p className="font-mono text-muted text-xs uppercase tracking-[.2em]">
            — &nbsp; Pricing &nbsp; —
          </p>
          <h1 className="mt-6 font-editorial text-6xl tracking-[-.03em] sm:text-7xl">
            Start free.
            <br />
            Pay when you create.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
            Launch is for one website. Studio is for several. Every paid plan includes creation,
            hosting, versions, and clear limits—with no setup fee or automatic overage.
          </p>
        </div>
        {checkoutNotice ? (
          <p
            className={`mb-5 border p-4 text-sm ${checkoutNotice.tone === 'danger' ? 'border-danger text-danger' : 'border-border text-muted'}`}
            role="status"
          >
            {checkoutNotice.message}
          </p>
        ) : null}
        <PricingCards currency={currency} websiteDraft={websiteDraft} {...upgradeContext} />
        <section className="mt-12 border border-border">
          <div className="border-border border-b p-6 sm:p-8">
            <p className="font-mono text-signal text-xs uppercase tracking-[.18em]">
              Creation allowance
            </p>
            <h2 className="mt-3 font-editorial text-4xl">You always know before work starts.</h2>
            <p className="mt-3 max-w-2xl text-muted leading-7">
              You do not need to calculate model usage or technical costs. CodeRocket shows the
              simple credit cost, creates a recoverable version, and stops when the allowance is
              empty.
            </p>
          </div>
          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['0 credits', 'Change text, a link, or a colour yourself'],
              ['Up to 6', 'Ask CodeRocket for one guided change'],
              ['6 credits', 'Add a page, product, contact list, or managed data'],
              ['20 credits', 'Create the first useful version from an existing website']
            ].map(([cost, detail]) => (
              <div className="bg-background p-5" key={detail}>
                <p className="font-heading font-semibold text-xl">{cost}</p>
                <p className="mt-2 text-muted text-sm leading-6">{detail}</p>
              </div>
            ))}
          </div>
        </section>
        <div className="mt-8 grid gap-px border border-border bg-border sm:grid-cols-3">
          {[
            [
              'Credits reserved first',
              'The displayed credit cost is reserved before work enters the queue, then recorded in your history.'
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
          Prices shown and charged in {currency} · Stripe confirms your address and applicable tax
          before payment · cancel at any time from the secure billing portal
        </p>
      </div>
    </main>
  )
}
