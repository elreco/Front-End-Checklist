import { readBrowserHandoffCredential } from '@coderocket/core/browser-handoff'
import { decryptAccessHeaders } from '@coderocket/db'
import { getSupabaseServerConfig } from './supabase/config'
import { createSupabaseServerClient } from './supabase/server'

export interface BuilderBrowserHandoff {
  expiresAt: string
  liveUrl?: string
  status: 'ready' | 'confirmed' | 'consuming' | 'expired' | 'unavailable'
  targetUrl: string
}

/** Return the current owner's temporary browser view without exposing its reconnect endpoint. */
export async function getBuilderBrowserHandoff(
  siteId: string
): Promise<BuilderBrowserHandoff | undefined> {
  if (process.env.CODEROCKET_DEMO_MODE === 'true') return
  if (!getSupabaseServerConfig()) return
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return
  const { data } = await supabase
    .from('cr_builder_browser_handoffs')
    .select('target_url,encrypted_session,status,expires_at')
    .eq('site_id', siteId)
    .eq('owner_id', auth.user.id)
    .maybeSingle()
  if (!data) return
  const expiresAt = data.expires_at
  const expired = new Date(expiresAt).getTime() <= Date.now()
  if (expired)
    return {
      expiresAt,
      status: 'expired',
      targetUrl: data.target_url
    }
  if (!(data.encrypted_session && data.status === 'ready'))
    return {
      expiresAt,
      status:
        data.status === 'confirmed' || data.status === 'consuming' ? data.status : 'unavailable',
      targetUrl: data.target_url
    }
  try {
    const credential = readBrowserHandoffCredential(decryptAccessHeaders(data.encrypted_session))
    return {
      expiresAt,
      liveUrl: credential?.liveUrl,
      status: credential ? 'ready' : 'unavailable',
      targetUrl: data.target_url
    }
  } catch {
    return {
      expiresAt,
      status: 'unavailable',
      targetUrl: data.target_url
    }
  }
}
