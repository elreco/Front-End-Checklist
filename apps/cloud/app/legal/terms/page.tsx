import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal-page'
import { createPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = createPublicMetadata({
  title: 'Terms of service',
  description:
    'Terms governing CodeRocket website recreation, hosting, subscriptions, generated changes, and acceptable use.',
  path: '/legal/terms'
})

export default function TermsPage() {
  return (
    <LegalPage
      description="These terms govern access to CodeRocket website recreation, hosting, generated changes, integrations, and publishing."
      title="Terms of service"
    >
      <h2>1. Agreement</h2>
      <p>
        By creating an account or using CodeRocket, you agree to these terms and the privacy policy.
        If you use CodeRocket for an organization or client, you confirm that you are authorized to
        accept these terms and create or publish websites for that organization or client.
      </p>

      <h2>2. The service</h2>
      <p>
        CodeRocket can study a public website or connected Figma design, rebuild visible content
        with controlled components, apply requested changes, and host an explicitly published
        version. A recreation is a technical aid, not a guarantee of legal compliance, security,
        accessibility, ranking, performance, exact fidelity, or uninterrupted availability.
      </p>

      <h2>3. Accounts and authorized websites</h2>
      <p>
        You must provide accurate account information, protect authentication methods and project
        tokens, and notify CodeRocket of suspected unauthorized use. You may access protected source
        pages or connected design files only when you are explicitly authorized to do so. Dedicated,
        least-privileged test accounts should be used for protected pages.
      </p>
      <p>
        Choose the ownership option only when you own the source content or have permission to
        migrate it. Inspiration mode must not be used to impersonate another organization or
        reproduce protected logos, images, wording, or trade dress.
      </p>

      <h2>4. Acceptable use</h2>
      <p>You must not use CodeRocket to:</p>
      <ul>
        <li>probe systems without authorization or bypass access controls;</li>
        <li>submit secrets, unlawful material, malware, or personal data that is not required;</li>
        <li>overload, reverse engineer, resell, or interfere with the service;</li>
        <li>misrepresent a generated website or relationship with CodeRocket;</li>
        <li>circumvent plan, usage, rate, account, or security limits.</li>
      </ul>

      <h2>5. Plans, billing, and cancellation</h2>
      <p>
        Current features and prices are shown on the pricing page. Paid subscriptions renew until
        canceled and are processed by Stripe. Website creation and hosting pause at their included
        ceilings; overage is never enabled automatically. Applicable taxes may be added at checkout.
        Canceling keeps paid access until the end of the current billing period unless the product
        states otherwise. Statutory refund rights remain unaffected.
      </p>

      <h2>6. Generated content and changes</h2>
      <p>
        Generated layouts, content, and changes may be incomplete, inaccurate, or unsuitable for a
        specific business. Review every version before publishing and verify legal claims, prices,
        links, forms, payments, and accessibility for your intended audience.
      </p>

      <h2>7. Availability and changes</h2>
      <p>
        CodeRocket may change features, limits, providers, or documentation to improve safety and
        reliability. Maintenance, provider failures, anti-bot systems, network errors, and protected
        pages can make an import incomplete. CodeRocket will explain when you need to provide access
        or choose a different source.
      </p>

      <h2>8. Ownership</h2>
      <p>
        You retain rights in your website and submitted content and grant CodeRocket the permission
        needed to retrieve, transform, store, and serve them at your request. You remain responsible
        for third-party rights and externally hosted assets. CodeRocket retains rights in the
        product, branding, application code, and service-specific presentation. Open-source
        dependencies remain subject to their applicable licenses and notices.
      </p>

      <h2>9. Suspension and termination</h2>
      <p>
        Access may be restricted or terminated for material breach, security risk, unlawful use,
        non-payment, or abuse. You may stop using the service at any time. Data deletion and legal
        retention are handled according to the privacy policy.
      </p>

      <h2>10. Liability and disputes</h2>
      <p>
        To the extent permitted by law, CodeRocket is provided without warranties beyond those that
        cannot legally be excluded. The operator is not liable for indirect loss, lost profit, lost
        rankings, or decisions made solely from a check or AI response. Mandatory consumer and data
        protection rights are not limited. Applicable law and competent courts follow the publisher
        information identified in the legal notice.
      </p>
    </LegalPage>
  )
}
