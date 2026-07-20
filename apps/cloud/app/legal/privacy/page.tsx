import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal-page'
import { createPublicMetadata, SUPPORT_EMAIL } from '@/lib/seo'

export const metadata: Metadata = createPublicMetadata({
  title: 'Privacy policy',
  description:
    'How CodeRocket collects, uses, protects, retains, and shares website creation, hosting, billing, and support data.',
  path: '/legal/privacy'
})

export default function PrivacyPage() {
  return (
    <LegalPage
      description="This policy explains what CodeRocket needs to recreate and host websites, protect accounts, provide guided changes, and manage subscriptions."
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
        <li>Website names, source URLs, selected pages, access mode, and project settings.</li>
        <li>
          Public source text, images, links, visual settings, editable site documents, versions, and
          publishing status.
        </li>
        <li>Generation and editing requests, generated versions, model metadata, and usage records.</li>
        <li>Plan, Stripe customer and subscription identifiers, invoices, and payment status.</li>
        <li>Security, delivery, error, support, and operational logs.</li>
        <li>
          Optional analytics data, such as visited pages, navigation events, browser and device
          information, and approximate location, only after consent.
        </li>
      </ul>
      <p>
        CodeRocket does not ask for payment card details directly. Stripe collects and processes
        payment information on its hosted pages.
      </p>

      <h2>3. Why we use it</h2>
      <p>
        We use this data to provide and secure the service, create requested website versions,
        publish approved versions, answer support requests, prevent abuse, administer subscriptions,
        and comply with legal obligations. Where consent is required, it can be withdrawn without
        affecting earlier lawful processing.
      </p>

      <h2>4. Website content and generated versions</h2>
      <p>
        Website recreation opens only public HTTPS pages and stores a bounded component document,
        not the source HTML or JavaScript. Owned-site mode may retain visible public copy and image
        URLs; inspiration mode removes source identity, images, and wording. When a user requests a
        first version or a change, bounded source content and relevant project context are sent to
        the configured AI provider. Common credential patterns are removed first. Passwords, access
        tokens, cookies, and secret headers must not be included in prompts or support requests.
      </p>

      <h2>5. Service providers</h2>
      <p>
        CodeRocket relies on service providers for hosting and networking, Supabase authentication
        and database services, Stripe billing, OpenAI-powered website generation, Google Analytics where
        consent is given, and transactional email. They process data only for the service they
        provide and under their own security and privacy commitments. International transfers may
        occur with appropriate contractual safeguards.
      </p>

      <h2>6. Retention</h2>
      <p>
        Generated website versions are retained while the website and account remain active so
        owners can recover earlier work. Temporary import captures expire automatically. Account,
        billing, security, and legal records may be kept longer when required for fraud prevention,
        dispute handling, tax, or legal compliance. Unpublishing a site removes its public version.
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
        protection authority. Optional analytics can be turned off at any time from Cookie settings.
        We may need to verify other requests before acting on them.
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
