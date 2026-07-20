import { Check, ExternalLink, Link2 } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketInput } from '@repo/design-system/ui/coderocket-field'
import type { BuilderSiteDetail } from '@/lib/builder-data'
import { saveBuilderLinkConnection } from './actions'

/** Offer working no-secret links first and keep developer-oriented connectors progressive. */
export function StudioConnectionsPanel({ site }: { site: BuilderSiteDetail }) {
  return (
    <div>
      <div className="border-border border-b p-4">
        <p className="font-mono text-signal text-xs uppercase tracking-[.16em]">Connections</p>
        <h2 className="mt-1 font-heading font-semibold text-xl">Add what your business needs</h2>
        <p className="mt-2 text-muted text-sm leading-6">
          Start with a secure link. CodeRocket handles the technical setup when a deeper connection
          is useful.
        </p>
      </div>
      <ConnectionForm
        detail="Accept a payment with a Stripe Payment Link. No secret key is required."
        existingUrl={findConnectionUrl(site, 'stripe')}
        label="Payments"
        placeholder="https://buy.stripe.com/..."
        provider="stripe"
        siteId={site.id}
      />
      <ConnectionForm
        detail="Let visitors choose an available time with Calendly or Cal.com."
        existingUrl={findConnectionUrl(site, 'calendly')}
        label="Appointments"
        placeholder="https://calendly.com/your-name/..."
        provider="calendly"
        siteId={site.id}
      />
      <div className="border-border border-t p-4">
        <div className="flex items-start gap-3">
          <Link2 aria-hidden className="mt-0.5 h-5 w-5 text-signal" />
          <div>
            <p className="font-semibold text-sm">Own database or shop</p>
            <p className="mt-1 text-muted text-xs leading-5">
              Supabase, Shopify, and advanced Stripe will appear here once guided account connection
              is enabled. Nothing is connected yet, and CodeRocket will never ask for a secret key
              in this screen.
            </p>
            <p className="mt-3 font-mono text-muted text-xs">NEXT GUIDED CONNECTIONS</p>
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
      <div className="mt-3 flex gap-2">
        <CodeRocketInput
          className="mt-0"
          defaultValue={existingUrl}
          name="url"
          placeholder={placeholder}
          required
          type="url"
        />
        <CodeRocketButton
          aria-label={`Save ${label.toLowerCase()} connection`}
          size="icon"
          type="submit"
        >
          {existingUrl ? <ExternalLink aria-hidden /> : <Link2 aria-hidden />}
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
