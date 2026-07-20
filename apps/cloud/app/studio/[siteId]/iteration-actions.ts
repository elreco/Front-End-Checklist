'use server'

import { siteEditSelectionSchema } from '@coderocket/core'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** Queue one multimodal website change after every reference file has finished uploading. */
export async function requestBuilderSiteEditWithContext(formData: FormData) {
  const siteId = String(formData.get('siteId') ?? '')
  const instruction = String(formData.get('instruction') ?? '')
    .trim()
    .slice(0, 2_000)
  const selection = parseSelection(String(formData.get('selection') ?? ''))
  const attachmentIds = parseAttachmentIds(String(formData.get('attachmentIds') ?? ''))
  if (!siteId) redirect('/websites')
  if (instruction.length < 2) redirect(`/studio/${siteId}?notice=describe-change`)

  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect(`/login?next=/studio/${encodeURIComponent(siteId)}`)
  const { error } = await supabase.rpc('cr_request_site_edit_with_context', {
    p_site_id: siteId,
    p_instruction: instruction,
    p_selection: selection ?? null,
    p_attachment_ids: attachmentIds
  })
  const notice = readRequestNotice(error?.message)
  redirect(`/studio/${siteId}?notice=${notice}`)
}

/** Recover only a schema-bounded preview selection from the hidden form value. */
function parseSelection(value: string) {
  if (!value) return undefined
  try {
    const parsed = siteEditSelectionSchema.safeParse(JSON.parse(value))
    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}

/** Recover at most three UUIDs without trusting browser-submitted JSON. */
function parseAttachmentIds(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(item => typeof item === 'string' && /^[0-9a-f-]{36}$/i.test(item))
      .slice(0, 3)
  } catch {
    return []
  }
}

/** Translate infrastructure errors into the small owner-facing Studio notice set. */
function readRequestNotice(error?: string): string {
  if (!error) return 'change-started'
  if (error.includes('creation credits')) return 'not-enough-credits'
  if (error.includes('already')) return 'change-already-running'
  if (error.includes('reference file')) return 'change-file-expired'
  return 'change-failed'
}
