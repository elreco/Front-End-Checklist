import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal-page'
import { createPublicMetadata, SITE_URL, SUPPORT_EMAIL } from '@/lib/seo'

export const metadata: Metadata = createPublicMetadata({
  title: 'Legal notice',
  description:
    'Publisher, hosting, intellectual property, contact, and service information for CodeRocket.',
  path: '/legal/notices'
})

export default function LegalNoticePage() {
  return (
    <LegalPage
      description="Publisher, hosting, contact, and intellectual property information for the CodeRocket website monitoring service."
      title="Legal notice"
    >
      <h2>Publisher</h2>
      <dl>
        <dt>Service</dt>
        <dd>CodeRocket</dd>
        <dt>Website</dt>
        <dd>
          <a href={SITE_URL}>{SITE_URL}</a>
        </dd>
        <dt>Contact</dt>
        <dd>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </dd>
      </dl>
      <p>
        The operator&apos;s registered legal name, registration number, registered address, VAT
        number where applicable, and publication director must be added here before paid public
        launch.
      </p>

      <h2>Hosting and infrastructure</h2>
      <p>
        CodeRocket uses Fly.io for application infrastructure and Supabase for authentication and
        database services. Payment pages and subscription management are provided by Stripe. Exact
        provider and regional information may change as the service evolves.
      </p>

      <h2>Intellectual property</h2>
      <p>
        CodeRocket names, logos, interface designs, and service-specific content may not be reused
        in a way that implies endorsement or affiliation. Third-party names, software,
        documentation, and the synchronized Front-End Checklist corpus remain subject to their
        respective rights and licenses.
      </p>

      <h2>Information and external links</h2>
      <p>
        Technical documentation is maintained carefully but can become outdated as browsers,
        standards, and providers change. External links are supplied for context; CodeRocket does
        not control their content or availability.
      </p>
    </LegalPage>
  )
}
