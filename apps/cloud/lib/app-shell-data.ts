import { getPlanEntitlements, type PlanEntitlements, type PlanId } from '@coderocket/core'
import { getInitials } from './format'
import { createSupabaseServerClient } from './supabase/server'

export interface AppShellContext {
  displayName: string
  email: string
  initials: string
  plan: PlanId
  limits: PlanEntitlements
  projectCount: number
  hasBillingAccount: boolean
}

const demoContext: AppShellContext = {
  displayName: 'Alex Morgan',
  email: 'alex@northstar.studio',
  initials: 'AM',
  plan: 'free',
  limits: getPlanEntitlements('free'),
  projectCount: 1,
  hasBillingAccount: false
}

/** Load the authenticated identity and plan shown throughout the product shell. */
export async function getAppShellContext(): Promise<AppShellContext> {
  if (process.env.CODEROCKET_DEMO_MODE === 'true') return demoContext
  if (!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY))
    return {
      ...demoContext,
      displayName: 'CodeRocket user',
      email: '',
      initials: 'CR',
      projectCount: 0
    }

  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user)
    return {
      ...demoContext,
      displayName: 'CodeRocket user',
      email: '',
      initials: 'CR',
      projectCount: 0
    }

  const [{ data: profile }, { data: subscription }, { count: projectCount }] = await Promise.all([
    supabase.from('cr_profiles').select('display_name').eq('id', auth.user.id).maybeSingle(),
    supabase
      .from('cr_subscriptions')
      .select('plan_id,stripe_customer_id')
      .eq('owner_id', auth.user.id)
      .maybeSingle(),
    supabase
      .from('cr_projects')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', auth.user.id)
      .is('archived_at', null)
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

  return {
    displayName,
    email,
    initials: getInitials(displayName),
    plan,
    limits: getPlanEntitlements(plan),
    projectCount: projectCount ?? 0,
    hasBillingAccount: Boolean(subscription?.stripe_customer_id)
  }
}
