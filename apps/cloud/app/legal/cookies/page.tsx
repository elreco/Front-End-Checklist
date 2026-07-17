import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal-page'
import { createPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = createPublicMetadata({
  title: 'Cookie policy',
  description:
    'How CodeRocket uses essential authentication, security, preference, and billing cookies.',
  path: '/legal/cookies'
})

export default function CookiePolicyPage() {
  return (
    <LegalPage
      description="CodeRocket keeps browser storage deliberately narrow. This page explains what is required for sign-in, security, and product preferences."
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
        CodeRocket does not currently set advertising cookies or third-party behavioral analytics
        cookies. If optional analytics are introduced, this policy and any required consent controls
        will be updated before those cookies are used.
      </p>

      <h2>5. Managing storage</h2>
      <p>
        Browser settings can remove cookies and local storage. Removing an authentication cookie
        signs the account out. Removing local preferences resets the associated interface option on
        that device.
      </p>
    </LegalPage>
  )
}
