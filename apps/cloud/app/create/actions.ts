'use server'

import { assertPublicHttpsUrl, type SiteSourceMode } from '@coderocket/core'
import { type FigmaFileScreenList, listFigmaFileScreens } from '@coderocket/core/figma-api'
import { normalizeFigmaNodeId, parseFigmaFileUrl } from '@coderocket/core/figma-source'
import { createServiceClient } from '@coderocket/db'
import { loadFigmaAccessToken } from '@coderocket/db/figma'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  deriveWebsiteName,
  normalizeInitialSiteInstruction,
  normalizeWebsiteDraft
} from '@/lib/website-draft'

/** Validate, reserve the bounded import budget, and enqueue one website recreation. */
export async function createBuilderSite(formData: FormData) {
  if (formData.get('sourceType') === 'figma') return createFigmaBuilderSite(formData)
  return createUrlBuilderSite(formData)
}

/** Keep the recommended public-URL journey unchanged while Figma uses the same durable queue. */
async function createUrlBuilderSite(formData: FormData) {
  const normalizedUrl = normalizeWebsiteDraft(String(formData.get('url') ?? '').trim())
  if (!normalizedUrl) redirect('/create?notice=invalid-url')
  let sourceUrl: string
  try {
    sourceUrl = (await assertPublicHttpsUrl(normalizedUrl)).toString()
  } catch {
    redirect('/create?notice=unreachable-url')
  }
  const returnPath = `/create?url=${encodeURIComponent(sourceUrl)}`
  const name = readRequestedName(formData) || deriveWebsiteName(sourceUrl)
  if (!validName(name)) redirect(`${returnPath}&notice=invalid-name`)
  const initialInstruction = readInitialInstruction(formData, returnPath)
  const sourceMode = readSourceMode(formData.get('sourceMode'))
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect(`/login?next=${encodeURIComponent(returnPath)}`)
  const { data, error } = await supabase.rpc('cr_request_site_import', {
    p_source_url: sourceUrl,
    p_name: name,
    p_source_mode: sourceMode,
    p_initial_instruction: initialInstruction ?? ''
  })
  handleCreationError(error?.message, returnPath)
  if (typeof data !== 'string') redirect('/create?notice=create-failed')
  redirect(`/studio/${data}`)
}

/** Verify the connected file and selected frames before reserving one normal website import. */
async function createFigmaBuilderSite(formData: FormData) {
  const reference = parseFigmaFileUrl(String(formData.get('figmaUrl') ?? ''))
  if (!reference) redirect('/create?source=figma&notice=invalid-figma-url')
  const returnPath = `/create?source=figma&figmaUrl=${encodeURIComponent(reference.url)}`
  const requestedIds = formData
    .getAll('figmaNodeId')
    .map(value => normalizeFigmaNodeId(String(value)))
  if (
    requestedIds.length < 1 ||
    requestedIds.length > 5 ||
    requestedIds.some(id => !id) ||
    new Set(requestedIds).size !== requestedIds.length
  )
    redirect(`${returnPath}&notice=invalid-figma-screens`)
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect(`/login?next=${encodeURIComponent(returnPath)}`)
  let inspection: FigmaFileScreenList
  try {
    const token = await loadFigmaAccessToken(createServiceClient(), auth.user.id)
    inspection = await listFigmaFileScreens(token, reference)
  } catch (error) {
    const notice =
      error instanceof Error && /connect|reconnect|oauth|configured/i.test(error.message)
        ? 'figma-connection-failed'
        : 'figma-file-unavailable'
    redirect(`${returnPath}&notice=${notice}`)
  }
  const requestedIdSet = new Set(requestedIds)
  const selectedScreens = requestedIds.flatMap(id => {
    if (!id) return []
    const screen = inspection.screens.find(candidate => candidate.id === id)
    return screen && requestedIdSet.has(screen.id) ? [screen] : []
  })
  if (selectedScreens.length !== requestedIds.length)
    redirect(`${returnPath}&notice=invalid-figma-screens`)
  const requestedName = readRequestedName(formData)
  const name = requestedName || inspection.fileName
  if (!validName(name)) redirect(`${returnPath}&notice=invalid-name`)
  const initialInstruction = readInitialInstruction(formData, returnPath)
  const { data, error } = await supabase.rpc('cr_request_figma_import', {
    p_source_url: reference.url,
    p_name: name,
    p_source_mode: readSourceMode(formData.get('sourceMode')),
    p_initial_instruction: initialInstruction ?? '',
    p_file_key: reference.fileKey,
    p_node_ids: selectedScreens.map(screen => screen.id),
    p_screen_names: selectedScreens.map(screen => screen.name)
  })
  handleCreationError(error?.message, returnPath)
  if (typeof data !== 'string') redirect(`${returnPath}&notice=create-failed`)
  redirect(`/studio/${data}`)
}

function readInitialInstruction(formData: FormData, returnPath: string): string | undefined {
  const rawInstruction = String(formData.get('initialInstruction') ?? '').trim()
  const initialInstruction = normalizeInitialSiteInstruction(rawInstruction)
  if (rawInstruction && !initialInstruction) redirect(`${returnPath}&notice=invalid-instruction`)
  return initialInstruction
}

function readRequestedName(formData: FormData): string {
  return String(formData.get('name') ?? '').trim()
}

function validName(value: string): boolean {
  return value.length >= 1 && value.length <= 120
}

function handleCreationError(message: string | undefined, returnPath: string): void {
  if (!message) return
  const normalized = message.toLowerCase()
  if (normalized.includes('paid website plan'))
    redirect('/pricing?current=free&recommended=solo&source=website_creation')
  if (normalized.includes('website limit')) redirect('/websites?notice=site-limit')
  if (normalized.includes('monthly website creation')) redirect('/websites?notice=monthly-limit')
  if (normalized.includes('connect figma')) redirect(`${returnPath}&notice=figma-connection-failed`)
  redirect(`${returnPath}&notice=create-failed`)
}

function readSourceMode(value: FormDataEntryValue | null): SiteSourceMode {
  return value === 'inspiration' ? 'inspiration' : 'owned'
}
