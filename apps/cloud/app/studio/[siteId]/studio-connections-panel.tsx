import { Check, Link2 } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketInput } from '@repo/design-system/ui/coderocket-field'
import type { BuilderSiteDetail } from '@/lib/builder-data'
import { saveBuilderLinkConnection } from './actions'

/** Offer working no-secret links first and keep developer-oriented connectors progressive. */
export function StudioConnectionsPanel({
  compact = false,
  site
}: {
  compact?: boolean
  site: BuilderSiteDetail
}) {
  return (
    <div>
      {compact ? null : (
        <div className="border-border border-b p-4">
          <p className="font-mono text-signal text-xs uppercase tracking-[.16em]">Connections</p>
          <h2 className="mt-1 font-heading font-semibold text-xl">Add what your business needs</h2>
          <p className="mt-2 text-muted text-sm leading-6">
            CodeRocket asks for a connection only when the project needs one.
          </p>
        </div>
      )}
      <ConnectionForm
        detail="Paste the Stripe payment page you want the website to open."
        existingUrl={findConnectionUrl(site, 'stripe')}
        label="Accept payments"
        placeholder="https://buy.stripe.com/..."
        provider="stripe"
        siteId={site.id}
      />
      <ConnectionForm
        detail="Paste the booking page visitors should use."
        existingUrl={findConnectionUrl(site, 'calendly')}
        label="Book appointments"
        placeholder="https://calendly.com/your-name/..."
        provider="calendly"
        siteId={site.id}
      />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Link2 aria-hidden className="mt-0.5 h-5 w-5 text-signal" />
          <div>
            <p className="font-semibold text-sm">Connected accounts</p>
            <p className="mt-1 text-muted text-xs leading-5">
              One-click Stripe, Shopify, and Supabase account authorisation is not enabled yet.
              Until then, CodeRocket only stores the public payment or booking page above.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ConnectionForm({
  detail,
  existingUrl,
  label,
  placeholder,
  provider,
  siteId
}: {
  detail: string
  existingUrl?: string
  label: string
  placeholder: string
  provider: 'calendly' | 'stripe'
  siteId: string
}) {
  return (
    <form action={saveBuilderLinkConnection} className="border-border border-b p-4">
      <input name="siteId" type="hidden" value={siteId} />
      <input name="provider" type="hidden" value={provider} />
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-sm">{label}</p>
        {existingUrl ? (
          <span className="flex items-center gap-1 font-mono text-success text-xs">
            <Check aria-hidden className="h-3.5 w-3.5" /> CONNECTED
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-muted text-xs leading-5">{detail}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <CodeRocketInput
          className="mt-0"
          defaultValue={existingUrl}
          name="url"
          placeholder={placeholder}
          required
          type="url"
        />
        <CodeRocketButton className="shrink-0" size="sm" type="submit">
          {existingUrl ? <Check aria-hidden /> : <Link2 aria-hidden />}
          {existingUrl ? 'Update' : 'Use this page'}
        </CodeRocketButton>
      </div>
    </form>
  )
}

function findConnectionUrl(
  site: BuilderSiteDetail,
  provider: 'calendly' | 'stripe'
): string | undefined {
  return site.connections.find(connection => connection.provider === provider)?.publicUrl
}
