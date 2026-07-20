'use server'

import { siteDocumentSchema } from '@coderocket/core'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** Restart one failed recreation without creating or counting another website import. */
export async function retryBuilderSite(formData: FormData) {
  const siteId = String(formData.get('siteId') ?? '')
  if (!siteId) redirect('/websites')
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect(`/login?next=/studio/${encodeURIComponent(siteId)}`)
  const { error } = await supabase.rpc('cr_retry_site_import', { p_site_id: siteId })
  redirect(`/studio/${siteId}?notice=${error ? 'retry-failed' : 'retry-started'}`)
}

const collectionPresets = {
  products: {
    name: 'Products',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'long_text', required: false },
      { key: 'price', label: 'Price', type: 'price', required: true },
      { key: 'image', label: 'Image', type: 'image', required: false },
      { key: 'available', label: 'Available', type: 'yes_no', required: true }
    ]
  },
  contacts: {
    name: 'Contacts',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'message', label: 'Message', type: 'long_text', required: false }
    ]
  },
  bookings: {
    name: 'Bookings',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'startsAt', label: 'Date and time', type: 'date_time', required: true },
      { key: 'status', label: 'Status', type: 'text', required: true }
    ]
  }
} as const

/** Create a managed data collection from a novice-friendly business preset. */
export async function createBuilderCollection(formData: FormData) {
  const siteId = String(formData.get('siteId') ?? '')
  const requestedPreset = String(formData.get('preset') ?? '')
  const preset =
    requestedPreset === 'products' ||
    requestedPreset === 'contacts' ||
    requestedPreset === 'bookings'
      ? requestedPreset
      : undefined
  if (!(siteId && preset)) redirect('/websites')
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect(`/login?next=/studio/${encodeURIComponent(siteId)}?panel=data`)
  const template = collectionPresets[preset]
  const { error } = await supabase.from('cr_builder_collections').insert({
    owner_id: auth.user.id,
    site_id: siteId,
    name: template.name,
    kind: preset,
    fields: template.fields
  })
  redirect(`/studio/${siteId}?panel=data&notice=${error ? 'data-failed' : 'data-ready'}`)
}

/** Save novice-facing content fields as a new recoverable site revision. */
export async function updateBuilderSite(formData: FormData) {
  const siteId = String(formData.get('siteId') ?? '')
  const requestedPagePath = String(formData.get('pagePath') ?? '/')
  const pagePath = requestedPagePath.startsWith('/') ? requestedPagePath : '/'
  if (!siteId) redirect('/websites')
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect(`/login?next=/studio/${encodeURIComponent(siteId)}`)
  const { data: revision } = await supabase
    .from('cr_site_revisions')
    .select('site_document')
    .eq('site_id', siteId)
    .eq('owner_id', auth.user.id)
    .order('revision_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  const parsed = siteDocumentSchema.safeParse(revision?.site_document)
  if (!parsed.success) redirect(studioNoticeHref(siteId, pagePath, 'missing-version'))
  const selectedPage = parsed.data.pages?.find(page => page.path === pagePath)
  if (pagePath !== '/' && !selectedPage) redirect(studioNoticeHref(siteId, '/', 'missing-version'))
  const selectedSections = selectedPage?.sections ?? parsed.data.sections
  const firstSection = selectedSections[0]
  if (!firstSection) redirect(studioNoticeHref(siteId, pagePath, 'missing-version'))
  const identityName = String(formData.get('identityName') ?? '')
    .trim()
    .slice(0, 120)
  const heading = String(formData.get('heading') ?? '')
    .trim()
    .slice(0, 180)
  const body = String(formData.get('body') ?? '')
    .trim()
    .slice(0, 1200)
  const ctaLabel = String(formData.get('ctaLabel') ?? '')
    .trim()
    .slice(0, 80)
  const rawCtaUrl = String(formData.get('ctaUrl') ?? '').trim()
  if (!identityName || !heading) redirect(studioNoticeHref(siteId, pagePath, 'invalid-content'))
  let ctaUrl: string | undefined
  if (rawCtaUrl) {
    try {
      const parsedUrl = new URL(rawCtaUrl)
      if (parsedUrl.protocol !== 'https:') throw new Error('HTTPS is required')
      ctaUrl = parsedUrl.toString()
    } catch {
      redirect(studioNoticeHref(siteId, pagePath, 'invalid-action-link'))
    }
  }
  const nextSections = [
    {
      ...firstSection,
      heading,
      body,
      links:
        ctaLabel && ctaUrl
          ? [{ href: ctaUrl, label: ctaLabel }, ...firstSection.links.slice(1)]
          : firstSection.links
    },
    ...selectedSections.slice(1)
  ]
  const nextDocument = siteDocumentSchema.parse({
    ...parsed.data,
    identity: { ...parsed.data.identity, name: identityName },
    sections: pagePath === '/' ? nextSections : parsed.data.sections,
    pages: parsed.data.pages?.map(page =>
      page.path === pagePath ? { ...page, title: heading, sections: nextSections } : page
    )
  })
  const { error } = await supabase.rpc('cr_update_builder_site_content', {
    p_site_id: siteId,
    p_site_document: nextDocument
  })
  redirect(studioNoticeHref(siteId, pagePath, error ? 'save-failed' : 'saved'))
}

/** Restore an owner-visible revision by copying it into a new immutable latest version. */
export async function restoreBuilderRevision(formData: FormData) {
  const siteId = String(formData.get('siteId') ?? '')
  const revisionId = String(formData.get('revisionId') ?? '')
  const requestedPagePath = String(formData.get('pagePath') ?? '/')
  const pagePath = requestedPagePath.startsWith('/') ? requestedPagePath : '/'
  if (!(siteId && revisionId)) redirect('/websites')
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect(`/login?next=/studio/${encodeURIComponent(siteId)}`)
  const { data: revision } = await supabase
    .from('cr_site_revisions')
    .select('site_document')
    .eq('id', revisionId)
    .eq('site_id', siteId)
    .eq('owner_id', auth.user.id)
    .maybeSingle()
  const parsed = siteDocumentSchema.safeParse(revision?.site_document)
  if (!parsed.success) redirect(studioNoticeHref(siteId, pagePath, 'restore-failed'))
  const { error } = await supabase.rpc('cr_update_builder_site_content', {
    p_site_id: siteId,
    p_site_document: parsed.data
  })
  redirect(studioNoticeHref(siteId, pagePath, error ? 'restore-failed' : 'restored'))
}

/** Point the public slug at the latest immutable revision. */
export async function publishBuilderSite(formData: FormData) {
  const siteId = String(formData.get('siteId') ?? '')
  if (!siteId) redirect('/websites')
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect(`/login?next=/studio/${encodeURIComponent(siteId)}`)
  const { error } = await supabase.rpc('cr_publish_builder_site', { p_site_id: siteId })
  redirect(`/studio/${siteId}?notice=${error ? 'publish-failed' : 'published'}`)
}

/** Keep the selected page visible after a save or validation notice. */
function studioNoticeHref(siteId: string, pagePath: string, notice: string): string {
  const query = new URLSearchParams({ notice })
  if (pagePath !== '/') query.set('page', pagePath)
  return `/studio/${siteId}?${query.toString()}`
}
