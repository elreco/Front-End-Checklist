'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** Stop one active first creation or Studio change without touching the last complete version. */
export async function cancelBuilderGeneration(formData: FormData) {
  const siteId = String(formData.get('siteId') ?? '')
  if (!siteId) redirect('/websites')
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect(`/login?next=/studio/${encodeURIComponent(siteId)}`)
  const { data, error } = await supabase.rpc('cr_cancel_builder_generation', {
    p_site_id: siteId
  })
  const notice = error
    ? 'generation-stop-failed'
    : typeof data === 'string'
      ? 'generation-stopped'
      : 'generation-already-finished'
  redirect(`/studio/${siteId}?notice=${notice}`)
}
