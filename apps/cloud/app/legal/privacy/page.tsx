import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal-page'
import { createPublicMetadata, SUPPORT_EMAIL } from '@/lib/seo'

export const metadata: Metadata = createPublicMetadata({
  title: 'Privacy policy',
  description:
    'How CodeRocket collects, uses, protects, retains, and shares account, website check, billing, and support data.',
  path: '/legal/privacy'
})

export default function PrivacyPage() {
  return (
    <LegalPage
      description="This policy explains what CodeRocket needs to run website checks, protect accounts, provide fix guidance, and manage subscriptions."
      title="Privacy policy"
    >
      <h2>1. Who is responsible</h2>
      <p>
        The operator of CodeRocket is responsible for personal data processed through
        coderocket.app. Privacy requests can be sent to{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>

      <h2>2. Data we process</h2>
      <ul>
        <li>Account identity, email address, authentication provider, and profile preferences.</li>
        <li>Website names, URLs, selected pages, access mode, and project settings.</li>
        <li>Check results, technical evidence, rule identifiers, history, and shared reports.</li>
        <li>AI requests, generated fix guidance, model metadata, and usage records.</li>
        <li>Plan, Stripe customer and subscription identifiers, invoices, and payment status.</li>
        <li>Security, delivery, error, support, and operational logs.</li>
      </ul>
      <p>
        CodeRocket does not ask for payment card details directly. Stripe collects and processes
        payment information on its hosted pages.
      </p>

      <h2>3. Why we use it</h2>
      <p>
        We use this data to provide and secure the service, run requested and scheduled checks,
        compare results, send important alerts, answer support requests, prevent abuse, administer
        subscriptions, and comply with legal obligations. Where consent is required, it can be
        withdrawn without affecting earlier lawful processing.
      </p>

      <h2>4. Website content and AI guidance</h2>
      <p>
        Public checks retrieve only configured HTTPS pages and save the evidence needed to explain a
        result. When a user explicitly requests an AI explanation, bounded finding evidence and the
        relevant rule context are sent to the configured AI provider. Common credential patterns are
        removed first. Passwords, runner tokens, cookies, and secret headers must not be included in
        support or AI requests.
      </p>

      <h2>5. Service providers</h2>
      <p>
        CodeRocket relies on service providers for hosting and networking, Supabase authentication
        and database services, Stripe billing, OpenAI-powered fix guidance, and transactional email.
        They process data only for the service they provide and under their own security and privacy
        commitments. International transfers may occur with appropriate contractual safeguards.
      </p>

      <h2>6. Retention</h2>
      <p>
        Website check history follows the active plan: normally 30 days on Free, 90 days on
        Personal, and 365 days on Agency. Account, billing, security, and legal records may be kept
        longer when required for fraud prevention, dispute handling, tax, or legal compliance.
        Revoked share links stop providing access immediately.
      </p>

      <h2>7. Security</h2>
      <p>
        CodeRocket uses tenant isolation, row-level database policies, encrypted HTTPS transport,
        hashed access tokens, signed billing webhooks, restricted service credentials, and safe URL
        validation. No internet service can guarantee absolute security, so suspected incidents
        should be reported promptly.
      </p>

      <h2>8. Your choices and rights</h2>
      <p>
        Depending on applicable law, you may request access, correction, deletion, restriction,
        portability, or objection. You may also withdraw consent and complain to the competent data
        protection authority. We may need to verify the request before acting on it.
      </p>

      <h2>9. Changes</h2>
      <p>
        Material changes will be reflected on this page with a new update date. If a change
        materially affects existing account data, CodeRocket may also notify account holders by
        email or inside the product.
      </p>
    </LegalPage>
  )
}
