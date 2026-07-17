import {
  ANALYTICS_CONSENT_DENIED,
  ANALYTICS_CONSENT_GRANTED,
  ANALYTICS_CONSENT_STORAGE_KEY,
  type AnalyticsConsent,
  parseAnalyticsConsent
} from '@/lib/analytics'

/** Pushes a command onto the Google tag queue without requiring the tag to be loaded. */
export function pushGoogleTagCommand(...command: unknown[]): void {
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push(command)
}

/** Updates Google Consent Mode while keeping all advertising capabilities disabled. */
export function setGoogleConsent(consent: 'denied' | 'granted'): void {
  pushGoogleTagCommand('consent', 'update', {
    ad_personalization: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    analytics_storage: consent
  })
}

/** Stores a versioned analytics preference when browser storage is available. */
export function persistAnalyticsConsent(consent: Exclude<AnalyticsConsent, null>): void {
  try {
    window.localStorage.setItem(
      ANALYTICS_CONSENT_STORAGE_KEY,
      consent === 'granted' ? ANALYTICS_CONSENT_GRANTED : ANALYTICS_CONSENT_DENIED
    )
  } catch {
    // The choice still applies for this page when browser storage is unavailable.
  }
}

/** Reads the versioned analytics preference without failing in restricted browsers. */
export function readStoredAnalyticsConsent(): AnalyticsConsent {
  try {
    return parseAnalyticsConsent(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY))
  } catch {
    return null
  }
}

/** Returns whether a route may contain authentication or private report details. */
export function isSensitiveAnalyticsPath(pathname: string): boolean {
  return pathname.startsWith('/auth/') || pathname.startsWith('/reports/')
}

/** Record a non-identifying product event only after optional analytics consent. */
export function trackProductEvent(
  eventName: 'checkout_started' | 'pricing_viewed' | 'upgrade_clicked' | 'upgrade_prompt_viewed',
  parameters: Record<string, boolean | number | string>
): void {
  if (readStoredAnalyticsConsent() !== 'granted') return
  if (isSensitiveAnalyticsPath(window.location.pathname)) return
  pushGoogleTagCommand('event', eventName, parameters)
}

/** Removes the first-party GA cookies after analytics consent is withdrawn. */
export async function removeAnalyticsCookies(measurementId: string): Promise<void> {
  const cookieNames = ['_ga', `_ga_${measurementId.replace('G-', '')}`]
  for (const name of cookieNames) {
    try {
      await window.cookieStore.delete({ name, path: '/' })
      await window.cookieStore.delete({ domain: 'coderocket.app', name, path: '/' })
    } catch {
      // Consent mode and the GA disable flag still stop collection if deletion is unavailable.
    }
  }
}
