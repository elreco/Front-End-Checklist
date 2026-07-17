'use client'

import { GoogleAnalytics } from '@next/third-parties/google'
import { BarChart3, ShieldCheck } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { AnalyticsConsent } from '@/lib/analytics'
import {
  isSensitiveAnalyticsPath,
  persistAnalyticsConsent,
  pushGoogleTagCommand,
  readStoredAnalyticsConsent,
  removeAnalyticsCookies,
  setGoogleConsent
} from '@/lib/analytics-browser'

const OPEN_ANALYTICS_SETTINGS_EVENT = 'coderocket:open-analytics-settings'

interface GoogleAnalyticsConsentProps {
  measurementId: string
  trackingEnabled: boolean
}

interface CookieSettingsButtonProps {
  className?: string
  compact?: boolean
}

/** Loads GA4 only after an explicit choice and keeps that choice reversible. */
export function GoogleAnalyticsConsent({
  measurementId,
  trackingEnabled
}: GoogleAnalyticsConsentProps) {
  const pathname = usePathname()
  const [consent, setConsent] = useState<AnalyticsConsent>(null)
  const [hasReadPreference, setHasReadPreference] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    window.dataLayer = window.dataLayer ?? []
    pushGoogleTagCommand('consent', 'default', {
      ad_personalization: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      analytics_storage: 'denied',
      wait_for_update: 500
    })
    pushGoogleTagCommand('set', 'allow_ad_personalization_signals', false)
    pushGoogleTagCommand('set', 'allow_google_signals', false)

    const storedConsent = readStoredAnalyticsConsent()
    if (storedConsent) {
      setGoogleConsent(storedConsent)
      window[`ga-disable-${measurementId}`] =
        storedConsent !== 'granted' || !trackingEnabled || isSensitiveAnalyticsPath(pathname)
      setConsent(storedConsent)
    }
    setHasReadPreference(true)

    /** Opens the analytics preference panel after a shared settings event. */
    const openSettings = () => setSettingsOpen(true)
    window.addEventListener(OPEN_ANALYTICS_SETTINGS_EVENT, openSettings)
    return () => window.removeEventListener(OPEN_ANALYTICS_SETTINGS_EVENT, openSettings)
  }, [])

  const analyticsAllowedOnRoute =
    trackingEnabled && consent === 'granted' && !isSensitiveAnalyticsPath(pathname)

  useEffect(() => {
    if (!hasReadPreference) return
    window[`ga-disable-${measurementId}`] = !analyticsAllowedOnRoute
  }, [analyticsAllowedOnRoute, hasReadPreference, measurementId])

  /** Applies and persists the visitor's explicit analytics preference. */
  const chooseConsent = (nextConsent: Exclude<AnalyticsConsent, null>) => {
    persistAnalyticsConsent(nextConsent)
    setGoogleConsent(nextConsent)
    window[`ga-disable-${measurementId}`] = nextConsent !== 'granted'
    setConsent(nextConsent)
    setSettingsOpen(false)
    if (nextConsent === 'denied') void removeAnalyticsCookies(measurementId)
  }

  const bannerVisible = hasReadPreference && (consent === null || settingsOpen)

  return (
    <>
      {analyticsAllowedOnRoute ? <GoogleAnalytics gaId={measurementId} /> : null}
      {bannerVisible ? (
        <div className="fixed inset-x-0 bottom-0 z-[90] p-3 sm:p-5">
          <section
            aria-labelledby="analytics-consent-title"
            className="mx-auto max-w-5xl border border-border bg-surface-raised p-5 shadow-2xl sm:p-6"
            role="region"
          >
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div>
                <p className="flex items-center gap-2 font-mono text-signal text-xs uppercase tracking-[.14em]">
                  <ShieldCheck aria-hidden className="h-4 w-4" /> Your privacy choice
                </p>
                <h2
                  className="mt-3 font-heading font-semibold text-2xl"
                  id="analytics-consent-title"
                >
                  Help us improve CodeRocket?
                </h2>
                <p className="mt-2 max-w-2xl text-muted text-sm leading-6">
                  Optional Google Analytics shows us which pages are useful. It loads only if you
                  allow it, is not used for advertising, and receives no account name or email from
                  CodeRocket.
                </p>
                <p className="mt-3 text-muted text-xs">
                  {consent === null
                    ? 'No optional analytics are running while you decide.'
                    : `Analytics are currently ${consent === 'granted' ? 'allowed' : 'off'}.`}{' '}
                  <Link className="text-signal hover:text-foreground" href="/legal/cookies">
                    Read the cookie policy
                  </Link>
                  .
                </p>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row md:justify-end">
                <CodeRocketButton
                  onClick={() => chooseConsent('denied')}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {consent === 'granted' ? 'Turn analytics off' : 'Keep analytics off'}
                </CodeRocketButton>
                <CodeRocketButton onClick={() => chooseConsent('granted')} size="sm" type="button">
                  <BarChart3 aria-hidden />
                  {consent === 'granted' ? 'Keep analytics on' : 'Allow analytics'}
                </CodeRocketButton>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}

/** Opens the shared analytics preference control from any public or account screen. */
export function CookieSettingsButton({ className, compact = false }: CookieSettingsButtonProps) {
  /** Opens the globally mounted analytics preference panel. */
  const openSettings = () => {
    window.dispatchEvent(new Event(OPEN_ANALYTICS_SETTINGS_EVENT))
  }

  return (
    <CodeRocketButton
      className={className}
      onClick={openSettings}
      size={compact ? undefined : 'sm'}
      type="button"
      variant={compact ? 'link' : 'outline'}
    >
      Cookie settings
    </CodeRocketButton>
  )
}
