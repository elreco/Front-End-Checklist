import { CalendlyBrandIcon, StripeBrandIcon } from '@repo/design-system/brand-icons'
import {
  Check,
  ChevronDown,
  Database,
  ExternalLink,
  Link2,
  Unplug
} from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketInput } from '@repo/design-system/ui/coderocket-field'
import type { ReactNode } from 'react'
import { type BuilderConnectionSummary, findBuilderConnection } from '@/lib/builder-connections'
import type { BuilderSiteDetail } from '@/lib/builder-data'
import { stripeAccountConnectionEnabled } from '@/lib/stripe-connect'
import { disconnectBuilderConnection, saveBuilderLinkConnection } from './connection-actions'
import { StudioFutureConnections } from './studio-future-connections'

/** Connect real project capabilities while keeping account details behind guided choices. */
export function StudioConnectionsPanel({
  compact = false,
  site
}: {
  compact?: boolean
  site: BuilderSiteDetail
}) {
  const stripe = findBuilderConnection(site.connections, 'stripe')
  const bookings = findBuilderConnection(site.connections, 'calendly')
  return (
    <div>
      {compact ? null : (
        <div className="border-border border-b p-4">
          <p className="font-mono text-[10px] text-signal uppercase tracking-[.16em]">
            Connections
          </p>
          <h2 className="mt-1 font-heading font-semibold text-lg">Add what this website needs</h2>
          <p className="mt-1.5 text-muted text-xs leading-5">
            Ask in the chat first. CodeRocket will prepare the right place, then request one quick
            permission here.
          </p>
        </div>
      )}
      <ManagedDataCard />
      <StripeCard connection={stripe} siteId={site.id} />
      <BookingCard connection={bookings} siteId={site.id} />
      <StudioFutureConnections />
    </div>
  )
}

/** Explain the managed storage included with every project without requesting setup. */
function ManagedDataCard() {
  return (
    <ConnectionCard
      description="Products, contacts, bookings, and content are saved with your website automatically."
      icon={<Database aria-hidden className="h-5 w-5" />}
      name="Website data"
      status="Included"
    >
      <p className="flex items-center gap-1.5 text-success text-xs">
        <Check aria-hidden className="h-3.5 w-3.5" /> Ready — no account or setup needed
      </p>
    </ConnectionCard>
  )
}

/** Guide an owner through Stripe onboarding or the simpler public-link fallback. */
function StripeCard({
  connection,
  siteId
}: {
  connection?: BuilderConnectionSummary
  siteId: string
}) {
  const accountEnabled = stripeAccountConnectionEnabled()
  const connected = connection?.status === 'connected'
  const accountMode = connected && connection.mode === 'account'
  const needsAttention = connection?.status === 'attention'
  const requested = connection?.status === 'setup'
  return (
    <ConnectionCard
      description="Let visitors pay from product cards and purchase buttons."
      icon={<StripeBrandIcon className="h-5 w-5" />}
      name="Payments"
      requested={requested}
      status={connected ? 'Ready' : needsAttention ? 'Finish setup' : undefined}
    >
      {accountMode || needsAttention ? (
        <div className="space-y-2.5">
          <p className={`text-xs ${needsAttention ? 'text-warning' : 'text-success'}`}>
            {needsAttention
              ? 'Stripe needs one last check before payments can open.'
              : `${connection.displayName ?? 'Stripe'} is ready for this website.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <CodeRocketButton asChild size="sm" variant={needsAttention ? 'primary' : 'ghost'}>
              <a
                href={
                  needsAttention
                    ? `/api/studio/${siteId}/connections/stripe/start`
                    : `/api/studio/${siteId}/connections/stripe/dashboard`
                }
              >
                <ExternalLink aria-hidden /> {needsAttention ? 'Finish in Stripe' : 'Open Stripe'}
              </a>
            </CodeRocketButton>
            <DisconnectButton provider="stripe" siteId={siteId} />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {accountEnabled ? (
            <CodeRocketButton asChild className="w-full" size="sm">
              <a href={`/api/studio/${siteId}/connections/stripe/start`}>
                <StripeBrandIcon className="h-4 w-4" /> Connect Stripe
              </a>
            </CodeRocketButton>
          ) : null}
          <details className="group/link" open={!accountEnabled || connection?.mode === 'link'}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs [&::-webkit-details-marker]:hidden">
              <span>
                {accountEnabled
                  ? 'Use one Stripe checkout page instead'
                  : 'Use a Stripe checkout page'}
              </span>
              <ChevronDown
                aria-hidden
                className="h-3.5 w-3.5 transition-transform group-open/link:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <LinkConnectionForm
              connected={connection?.status === 'connected' && connection.mode === 'link'}
              existingUrl={connection?.publicUrl}
              placeholder="https://buy.stripe.com/..."
              provider="stripe"
              siteId={siteId}
            />
          </details>
        </div>
      )}
    </ConnectionCard>
  )
}

/** Connect one public appointment page to the website's booking actions. */
function BookingCard({
  connection,
  siteId
}: {
  connection?: BuilderConnectionSummary
  siteId: string
}) {
  return (
    <ConnectionCard
      description="Open your Calendly or Cal.com page from every booking button."
      icon={<CalendlyBrandIcon className="h-5 w-5" />}
      name="Appointments"
      requested={connection?.status === 'setup'}
      status={connection?.status === 'connected' ? 'Ready' : undefined}
    >
      <LinkConnectionForm
        connected={connection?.status === 'connected'}
        existingUrl={connection?.publicUrl}
        placeholder="https://calendly.com/your-name/..."
        provider="calendly"
        siteId={siteId}
      />
    </ConnectionCard>
  )
}

/** Validate and save one novice-friendly public service page. */
function LinkConnectionForm({
  connected,
  existingUrl,
  placeholder,
  provider,
  siteId
}: {
  connected: boolean
  existingUrl?: string
  placeholder: string
  provider: 'calendly' | 'stripe'
  siteId: string
}) {
  return (
    <form action={saveBuilderLinkConnection} className="mt-2.5 space-y-2">
      <input name="siteId" type="hidden" value={siteId} />
      <input name="provider" type="hidden" value={provider} />
      <CodeRocketInput
        className="mt-0"
        defaultValue={existingUrl}
        name="url"
        placeholder={placeholder}
        required
        type="url"
      />
      <div className="flex items-center gap-2">
        <CodeRocketButton className="flex-1" size="sm" type="submit">
          {connected ? <Check aria-hidden /> : <Link2 aria-hidden />}
          {connected ? 'Update website' : 'Use this page'}
        </CodeRocketButton>
        {connected ? <DisconnectButton provider={provider} siteId={siteId} /> : null}
      </div>
    </form>
  )
}

/** Remove one service from this project without deleting the provider account. */
function DisconnectButton({
  provider,
  siteId
}: {
  provider: 'calendly' | 'stripe'
  siteId: string
}) {
  return (
    <form action={disconnectBuilderConnection}>
      <input name="siteId" type="hidden" value={siteId} />
      <input name="provider" type="hidden" value={provider} />
      <CodeRocketButton
        aria-label="Disconnect this service"
        size="sm"
        type="submit"
        variant="ghost"
      >
        <Unplug aria-hidden /> Disconnect
      </CodeRocketButton>
    </form>
  )
}

/** Present one connector outcome, its state, and the single relevant next action. */
function ConnectionCard({
  children,
  description,
  icon,
  name,
  requested = false,
  status
}: {
  children: ReactNode
  description: string
  icon: ReactNode
  name: string
  requested?: boolean
  status?: string
}) {
  return (
    <section className={`border-border border-b p-4 ${requested ? 'bg-surface-raised' : ''}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-signal">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-sm">{name}</h3>
            {status ? (
              <span className="shrink-0 font-mono text-[10px] text-success uppercase">
                {status}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-muted text-xs leading-5">{description}</p>
          {requested ? (
            <p className="mt-2 border border-signal px-2 py-1.5 text-signal text-xs">
              Your last request needs this connection.
            </p>
          ) : null}
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </section>
  )
}
