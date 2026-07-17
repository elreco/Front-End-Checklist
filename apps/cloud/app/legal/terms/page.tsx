import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal-page'
import { createPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = createPublicMetadata({
  title: 'Terms of service',
  description:
    'Terms governing CodeRocket accounts, website checks, subscriptions, AI guidance, reports, and acceptable use.',
  path: '/legal/terms'
})

export default function TermsPage() {
  return (
    <LegalPage
      description="These terms govern access to CodeRocket website monitoring, fix guidance, integrations, and shared reports."
      title="Terms of service"
    >
      <h2>1. Agreement</h2>
      <p>
        By creating an account or using CodeRocket, you agree to these terms and the privacy policy.
        If you use CodeRocket for an organization or client, you confirm that you are authorized to
        accept these terms and configure checks for those websites.
      </p>

      <h2>2. The service</h2>
      <p>
        CodeRocket checks configured website pages, records technical findings, compares completed
        checks, and provides documentation and optional AI-assisted fix guidance. A result is a
        technical aid, not a guarantee of legal compliance, security, accessibility, ranking,
        performance, or uninterrupted availability.
      </p>

      <h2>3. Accounts and authorized websites</h2>
      <p>
        You must provide accurate account information, protect authentication methods and project
        tokens, and notify CodeRocket of suspected unauthorized use. You may check only websites and
        environments you own or are explicitly authorized to test. Dedicated, least-privileged test
        accounts should be used for protected pages.
      </p>

      <h2>4. Acceptable use</h2>
      <p>You must not use CodeRocket to:</p>
      <ul>
        <li>probe systems without authorization or bypass access controls;</li>
        <li>submit secrets, unlawful material, malware, or personal data that is not required;</li>
        <li>overload, reverse engineer, resell, or interfere with the service;</li>
        <li>misrepresent a check, report, recommendation, or relationship with CodeRocket;</li>
        <li>circumvent plan, usage, rate, account, or security limits.</li>
      </ul>

      <h2>5. Plans, billing, and cancellation</h2>
      <p>
        Current features and prices are shown on the pricing page. Paid subscriptions renew until
        canceled and are processed by Stripe. Paid plans include a monthly AI allowance. Token-based
        AI usage above that allowance is added to the same invoice up to the spending cap shown for
        the selected plan. Applicable taxes may be added at checkout. Canceling keeps paid access
        until the end of the current billing period unless the product states otherwise. Statutory
        refund rights remain unaffected.
      </p>

      <h2>6. AI and technical guidance</h2>
      <p>
        AI explanations are grounded in saved evidence and the referenced rule, but they may still
        be incomplete or unsuitable for a specific stack. Review changes before applying them. AI
        cannot edit your website or mark a finding fixed; only a later completed check can verify a
        technical change.
      </p>

      <h2>7. Availability and changes</h2>
      <p>
        CodeRocket may change features, limits, providers, or documentation to improve safety and
        reliability. Maintenance, provider failures, anti-bot systems, network errors, and protected
        pages can make a check incomplete. Incomplete pages must not be treated as passing.
      </p>

      <h2>8. Ownership</h2>
      <p>
        You retain rights in your website and submitted content. CodeRocket retains rights in the
        product, branding, application code, and service-specific presentation. The synchronized
        Front-End Checklist corpus remains subject to its applicable upstream license and notices.
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
