/** Billing currencies offered by every CodeRocket Stripe price. */
export type PricingCurrency = 'AUD' | 'CAD' | 'CHF' | 'EUR' | 'GBP' | 'USD'

type LocalizedPlanPrice = {
  agency: number
  agencyAiCap: number
  locale: string
  personal: number
  personalAiCap: number
}

/** Stable localized monthly prices and AI spending caps mirrored in Stripe. */
export const LOCALIZED_PRICING: Record<PricingCurrency, LocalizedPlanPrice> = {
  AUD: { agency: 249, agencyAiCap: 170, locale: 'en-AU', personal: 49, personalAiCap: 34 },
  CAD: { agency: 219, agencyAiCap: 150, locale: 'en-CA', personal: 45, personalAiCap: 30 },
  CHF: { agency: 139, agencyAiCap: 95, locale: 'de-CH', personal: 27, personalAiCap: 19 },
  EUR: { agency: 149, agencyAiCap: 100, locale: 'en-IE', personal: 29, personalAiCap: 20 },
  GBP: { agency: 129, agencyAiCap: 90, locale: 'en-GB', personal: 25, personalAiCap: 18 },
  USD: { agency: 169, agencyAiCap: 110, locale: 'en-US', personal: 32, personalAiCap: 22 }
}

const COUNTRY_CURRENCIES: Record<string, PricingCurrency> = {
  AU: 'AUD',
  CA: 'CAD',
  CH: 'CHF',
  GB: 'GBP',
  US: 'USD'
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

/** Format a whole-number CodeRocket price with its localized currency symbol. */
export function formatLocalizedPrice(amount: number, currency: PricingCurrency): string {
  return new Intl.NumberFormat(LOCALIZED_PRICING[currency].locale, {
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: 'currency'
  }).format(amount)
}
