import { getAuthRedirectUrl } from './auth-redirect'

interface StripeConnectedAccountReceipt {
  business_profile?: { name?: string | null } | null
  charges_enabled: boolean
  email?: string | null
  settings?: { dashboard?: { display_name?: string | null } | null } | null
}

/** Report whether this installation can create hosted Stripe account onboarding links. */
export function stripeAccountConnectionEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

/** Build one authenticated return URL without trusting reverse-proxy request origins. */
export function stripeConnectReturnUrl(
  requestUrl: string,
  siteId: string,
  configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
): string {
  const url = getAuthRedirectUrl('/api/connections/stripe/return', requestUrl, configuredSiteUrl)
  url.searchParams.set('siteId', siteId)
  return url.toString()
}

/** Keep the visible project status aligned with Stripe's ability to accept a charge. */
export function stripeConnectedAccountStatus(
  account: StripeConnectedAccountReceipt
): 'attention' | 'connected' {
  return account.charges_enabled ? 'connected' : 'attention'
}

/** Use business-facing account information without exposing verification details. */
export function stripeConnectedAccountName(account: StripeConnectedAccountReceipt): string {
  return (
    account.business_profile?.name ??
    account.settings?.dashboard?.display_name ??
    account.email ??
    'Stripe payments'
  ).slice(0, 120)
}
