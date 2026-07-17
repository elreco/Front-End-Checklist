import type { Metadata } from 'next'
import { CookieSettingsButton } from '@/components/google-analytics-consent'
import { LegalPage } from '@/components/legal-page'
import { createPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = createPublicMetadata({
  title: 'Cookie policy',
  description:
    'How CodeRocket uses essential authentication, security, preference, billing, and optional analytics cookies.',
  path: '/legal/cookies'
})

export default function CookiePolicyPage() {
  return (
    <LegalPage
      description="CodeRocket keeps browser storage deliberately narrow. This page explains essential storage, product preferences, and optional analytics."
      title="Cookie policy"
    >
      <h2>1. Essential cookies</h2>
      <p>
        CodeRocket and its authentication provider use essential cookies to keep users signed in,
        refresh secure sessions, protect account routes, and complete authentication callbacks.
        Disabling them prevents account features from working.
      </p>

      <h2>2. Security and billing</h2>
      <p>
        Stripe may use cookies or similar storage on its hosted Checkout and Customer Portal pages
        to prevent fraud, secure payment flows, and remember a billing session. Those pages are
        governed by Stripe&apos;s own cookie and privacy information.
      </p>

      <h2>3. Local product preferences</h2>
      <p>
        CodeRocket stores a small number of device-local preferences, such as whether the
        application sidebar is compact and whether a completed onboarding message was dismissed.
        These values do not track activity across unrelated websites.
      </p>

      <h2>4. Analytics and advertising</h2>
      <p>
        With your permission, CodeRocket loads Google Analytics to understand page visits and
        navigation patterns. Google Analytics may set first-party cookies such as <code>_ga</code>{' '}
        and <code>_ga_*</code>. The integration is not loaded before you allow analytics, is not
        used for advertising, and CodeRocket does not send your account name or email as analytics
        event data.
      </p>

      <h2>5. Managing storage</h2>
      <p>
        You can change the optional analytics choice at any time. Turning analytics off disables
        collection and removes the CodeRocket Google Analytics cookies where the browser permits it.
        Browser settings can also remove cookies and local storage. Removing an authentication
        cookie signs the account out; removing local preferences resets the associated interface
        option on that device.
      </p>
      <CookieSettingsButton />
    </LegalPage>
  )
}
