import {
  getBuilderPlanEntitlements,
  type PlanId
} from '@coderocket/core'
import { getInitials } from './format'
import { getSupabaseServerConfig } from './supabase/config'
import { createSupabaseServerClient } from './supabase/server'

export interface AppShellContext {
  displayName: string
  email: string
  initials: string
  plan: PlanId
  builderLimits: ReturnType<typeof getBuilderPlanEntitlements>
  builderCreditsRemaining: number
  builderSiteCount: number
  hasBillingAccount: boolean
}

const demoContext: AppShellContext = {
  displayName: 'Alex Morgan',
  email: 'alex@northstar.studio',
  initials: 'AM',
  plan: 'free',
  builderLimits: getBuilderPlanEntitlements('free'),
  builderCreditsRemaining: 0,
  builderSiteCount: 0,
  hasBillingAccount: false
}

/** Load the authenticated identity and plan shown throughout the product shell. */
export async function getAppShellContext(): Promise<AppShellContext> {
  if (process.env.CODEROCKET_DEMO_MODE === 'true') return demoContext
  if (!getSupabaseServerConfig())
    return {
      ...demoContext,
      displayName: 'CodeRocket user',
      email: '',
      initials: 'CR'
    }

  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user)
    return {
      ...demoContext,
      displayName: 'CodeRocket user',
      email: '',
      initials: 'CR'
    }

  const [
    { data: profile },
    { data: subscription },
    { count: builderSiteCount },
    { data: builderUsage }
  ] = await Promise.all([
    supabase.from('cr_profiles').select('display_name').eq('id', auth.user.id).maybeSingle(),
    supabase
      .from('cr_subscriptions')
      .select('plan_id,stripe_customer_id')
      .eq('owner_id', auth.user.id)
      .maybeSingle(),
    supabase
      .from('cr_builder_sites')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', auth.user.id)
      .is('archived_at', null),
    supabase
      .from('cr_builder_usage_accounts')
      .select('creation_credit_limit,creation_credits_used,credits_period_ends_at')
      .eq('owner_id', auth.user.id)
      .maybeSingle()
  ])
  const plan: PlanId =
    subscription?.plan_id === 'solo' || subscription?.plan_id === 'agency'
      ? subscription.plan_id
      : 'free'
  const email = auth.user.email ?? ''
  const metadataName =
    typeof auth.user.user_metadata?.full_name === 'string'
      ? auth.user.user_metadata.full_name
      : undefined
  const displayName =
    profile?.display_name || metadataName || email.split('@')[0] || 'CodeRocket user'
  const builderLimits = getBuilderPlanEntitlements(plan)
  const usageIsCurrent =
    builderUsage?.credits_period_ends_at &&
    new Date(builderUsage.credits_period_ends_at).getTime() > Date.now()
  const builderCreditsRemaining = usageIsCurrent
    ? Math.max(
        0,
        (builderUsage?.creation_credit_limit ?? builderLimits.creationCreditsPerMonth) -
          (builderUsage?.creation_credits_used ?? 0)
      )
    : builderLimits.creationCreditsPerMonth

  return {
    displayName,
    email,
    initials: getInitials(displayName),
    plan,
    builderLimits,
    builderCreditsRemaining,
    builderSiteCount: builderSiteCount ?? 0,
    hasBillingAccount: Boolean(subscription?.stripe_customer_id)
  }
}
