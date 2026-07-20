/** Billing currencies supported by every live CodeRocket Stripe price. */
export type PricingCurrency = 'AUD' | 'CAD' | 'CHF' | 'EUR' | 'GBP' | 'USD'

type LocalizedPlanPrice = {
  launch: number
  locale: string
  studio: number
}

/** Stable monthly price points mirrored exactly in Stripe currency options. */
export const LOCALIZED_PRICING: Record<PricingCurrency, LocalizedPlanPrice> = {
  AUD: { launch: 49, locale: 'en-AU', studio: 249 },
  CAD: { launch: 45, locale: 'en-CA', studio: 219 },
  CHF: { launch: 27, locale: 'de-CH', studio: 139 },
  EUR: { launch: 29, locale: 'fr-FR', studio: 149 },
  GBP: { launch: 25, locale: 'en-GB', studio: 129 },
  USD: { launch: 32, locale: 'en-US', studio: 169 }
}

const COUNTRY_CURRENCIES: Record<string, PricingCurrency> = {
  AU: 'AUD',
  CA: 'CAD',
  CH: 'CHF',
  GB: 'GBP',
  US: 'USD'
}

const STRIPE_CURRENCIES: Record<PricingCurrency, string> = {
  AUD: 'aud',
  CAD: 'cad',
  CHF: 'chf',
  EUR: 'eur',
  GBP: 'gbp',
  USD: 'usd'
}

/** Resolve the supported billing currency for a two-letter country code. */
export function pricingCurrencyForCountry(countryCode?: string | null): PricingCurrency {
  if (!countryCode) return 'EUR'
  return COUNTRY_CURRENCIES[countryCode.trim().toUpperCase()] ?? 'EUR'
}

/** Resolve pricing from common CDN country headers, preferring Cloudflare. */
export function pricingCurrencyFromHeaders(requestHeaders: Pick<Headers, 'get'>): PricingCurrency {
  const countryCode =
    requestHeaders.get('cf-ipcountry') ??
    requestHeaders.get('x-vercel-ip-country') ??
    requestHeaders.get('cloudfront-viewer-country')
  return pricingCurrencyForCountry(countryCode)
}

/** Accept only a currency that is supported by every Stripe Checkout line item. */
export function readPricingCurrency(value: FormDataEntryValue | null): PricingCurrency {
  if (typeof value !== 'string') return 'EUR'
  const currency = value.trim().toUpperCase()
  if (currency === 'AUD') return 'AUD'
  if (currency === 'CAD') return 'CAD'
  if (currency === 'CHF') return 'CHF'
  if (currency === 'GBP') return 'GBP'
  if (currency === 'USD') return 'USD'
  return 'EUR'
}

/** Return the lowercase currency code expected by Stripe Checkout. */
export function stripeCurrency(currency: PricingCurrency): string {
  return STRIPE_CURRENCIES[currency]
}

/** Format a whole-number CodeRocket price with its localized currency symbol. */
export function formatLocalizedPrice(amount: number, currency: PricingCurrency): string {
  return new Intl.NumberFormat(LOCALIZED_PRICING[currency].locale, {
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: 'currency'
  }).format(amount)
}
