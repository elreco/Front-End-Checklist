import { Database, KeyRound, LockKeyhole, Network, Webhook } from '@repo/design-system/icons'
import type { Metadata } from 'next'
import { DocsHeader } from '@/components/docs-shell'

export const metadata: Metadata = {
  title: 'Security model',
  description: 'CodeRocket tenant isolation, safe fetching, token storage, and webhook security.'
}

const controls = [
  {
    icon: Network,
    title: 'Public HTTPS only',
    description:
      'Every hostname and redirect is resolved over IPv4 and IPv6. Local, private, reserved, link-local, multicast, and documentation networks are rejected before fetching.'
  },
  {
    icon: Database,
    title: 'Row-level tenant isolation',
    description:
      'Supabase RLS scopes user-facing CodeRocket rows to auth.uid(). Internal queue, Stripe event, migration, and heartbeat tables are not exposed to browser roles.'
  },
  {
    icon: KeyRound,
    title: 'Hashed bearer secrets',
    description:
      'Project tokens and private report tokens are generated from cryptographic randomness. The plaintext is returned once; only a SHA-256 hash remains in the database.'
  },
  {
    icon: Webhook,
    title: 'Signed, idempotent billing',
    description:
      'Stripe signatures are verified against the raw payload. Processed event IDs are recorded so webhook retries cannot apply subscription state twice.'
  }
]

export default function SecurityDocumentationPage() {
  return (
    <>
      <DocsHeader
        description="CodeRocket accepts arbitrary public site URLs and stores client audit history, so network boundaries and tenant isolation are part of the product—not deployment afterthoughts."
        eyebrow="Trust boundaries"
        title="Secure by construction, narrow by default."
      />

      <section className="grid gap-4 py-10 sm:grid-cols-2">
        {controls.map(({ description, icon: Icon, title }) => (
          <article className="border border-border bg-surface p-6" key={title}>
            <Icon aria-hidden className="h-6 w-6 text-signal" />
            <h2 className="mt-5 font-heading font-semibold text-xl">{title}</h2>
            <p className="mt-3 text-muted leading-7">{description}</p>
          </article>
        ))}
      </section>

      <section className="border-border border-y py-10">
        <LockKeyhole aria-hidden className="h-6 w-6 text-accent" />
        <h2 className="mt-5 font-editorial text-4xl tracking-[-.025em]">Credential boundaries</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="border border-border bg-surface p-5">
            <h3 className="font-heading font-semibold">Browser-safe</h3>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-muted text-sm">
              <li>Supabase project URL</li>
              <li>Supabase publishable key</li>
              <li>Owner-scoped session cookies</li>
            </ul>
          </div>
          <div className="border border-border bg-surface p-5">
            <h3 className="font-heading font-semibold">Server and worker only</h3>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-muted text-sm">
              <li>Supabase service-role key</li>
              <li>Direct PostgreSQL connection</li>
              <li>Stripe and webhook secrets</li>
              <li>Resend API key</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="py-10">
        <p className="font-mono text-accent text-xs uppercase tracking-[.16em]">Data lifecycle</p>
        <h2 className="mt-4 font-editorial text-4xl tracking-[-.025em]">
          Retention follows the plan.
        </h2>
        <p className="mt-4 max-w-3xl text-muted leading-7">
          A worker periodically removes audits older than the owner plan allows: 30 days for Free,
          90 days for Solo, and 365 days for Agency. Database migrations create a private,
          checksummed backup before schema changes are applied.
        </p>
      </section>
    </>
  )
}
