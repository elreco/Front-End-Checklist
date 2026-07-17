const DEFAULT_GOOGLE_ANALYTICS_ID = 'G-0HBMKNN8MQ'

export const GOOGLE_ANALYTICS_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim() || DEFAULT_GOOGLE_ANALYTICS_ID

export const ANALYTICS_CONSENT_STORAGE_KEY = 'coderocket:analytics-consent'
export const ANALYTICS_CONSENT_GRANTED = 'v1:granted'
export const ANALYTICS_CONSENT_DENIED = 'v1:denied'

export type AnalyticsConsent = 'denied' | 'granted' | null

/** Parses the versioned browser preference without accepting stale consent formats. */
export function parseAnalyticsConsent(value: string | null): AnalyticsConsent {
  if (value === ANALYTICS_CONSENT_GRANTED) return 'granted'
  if (value === ANALYTICS_CONSENT_DENIED) return 'denied'
  return null
}
