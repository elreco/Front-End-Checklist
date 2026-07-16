'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** Persist the authenticated user's CodeRocket display name. */
export async function updateProfile(formData: FormData) {
  const displayName = String(formData.get('displayName') ?? '').trim()
  if (displayName.length < 1 || displayName.length > 80) redirect('/settings?notice=invalid-name')
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login?next=/settings')
  const { error } = await supabase
    .from('cr_profiles')
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq('id', auth.user.id)
  revalidatePath('/settings')
  revalidatePath('/dashboard')
  redirect(`/settings?notice=${error ? 'save-failed' : 'saved'}`)
}
