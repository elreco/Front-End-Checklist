'use server'

import { assertPublicHttpsUrl, type SiteSourceMode } from '@coderocket/core'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  deriveWebsiteName,
  normalizeInitialSiteInstruction,
  normalizeWebsiteDraft
} from '@/lib/website-draft'

/** Validate, reserve the bounded import budget, and enqueue one website recreation. */
export async function createBuilderSite(formData: FormData) {
  const normalizedUrl = normalizeWebsiteDraft(String(formData.get('url') ?? '').trim())
  if (!normalizedUrl) redirect('/create?notice=invalid-url')
  let sourceUrl: string
  try {
    sourceUrl = (await assertPublicHttpsUrl(normalizedUrl)).toString()
  } catch {
    redirect('/create?notice=unreachable-url')
  }
  const requestedName = String(formData.get('name') ?? '').trim()
  const name = requestedName || deriveWebsiteName(sourceUrl)
  if (name.length < 1 || name.length > 120)
    redirect(`/create?url=${encodeURIComponent(sourceUrl)}&notice=invalid-name`)
  const rawInstruction = String(formData.get('initialInstruction') ?? '').trim()
  const initialInstruction = normalizeInitialSiteInstruction(rawInstruction)
  if (rawInstruction && !initialInstruction)
    redirect(`/create?url=${encodeURIComponent(sourceUrl)}&notice=invalid-instruction`)
  const sourceMode = readSourceMode(formData.get('sourceMode'))
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user)
    redirect(`/login?next=${encodeURIComponent(`/create?url=${encodeURIComponent(sourceUrl)}`)}`)
  const { data, error } = await supabase.rpc('cr_request_site_import', {
    p_source_url: sourceUrl,
    p_name: name,
    p_source_mode: sourceMode,
    p_initial_instruction: initialInstruction ?? ''
  })
  if (error) {
    const message = error.message.toLowerCase()
    if (message.includes('paid website plan'))
      redirect('/pricing?current=free&recommended=solo&source=website_creation')
    if (message.includes('website limit')) redirect('/websites?notice=site-limit')
    if (message.includes('monthly website creation')) redirect('/websites?notice=monthly-limit')
    redirect(`/create?url=${encodeURIComponent(sourceUrl)}&notice=create-failed`)
  }
  if (typeof data !== 'string') redirect('/create?notice=create-failed')
  redirect(`/studio/${data}`)
}

function readSourceMode(value: FormDataEntryValue | null): SiteSourceMode {
  return value === 'inspiration' ? 'inspiration' : 'owned'
}
