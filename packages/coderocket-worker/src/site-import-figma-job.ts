import { createHash } from 'node:crypto'
import {
  DEFAULT_SITE_VISUAL_MODEL,
  OpenAiSiteVisualAnalysisProvider,
  SITE_VISUAL_MAX_OUTPUT_TOKENS
} from '@coderocket/ai'
import {
  createSiteBundleDocument,
  createSiteDocument,
  getBuilderPlanEntitlements,
  type SiteDocument,
  type SiteSourceBlueprint
} from '@coderocket/core'
import { readFigmaSelectedScreens } from '@coderocket/core/figma-api'
import { createFigmaScreenBlueprint } from '@coderocket/core/figma-blueprint'
import {
  createFigmaScreenPaths,
  figmaNodeUrl,
  parseFigmaFileUrl
} from '@coderocket/core/figma-source'
import { fetchPublicImage } from '@coderocket/core/safe-fetch'
import { applySiteVisualRefinement, applySiteVisualTheme } from '@coderocket/core/site-visual'
import { createServiceClient } from '@coderocket/db'
import { loadFigmaAccessToken } from '@coderocket/db/figma'
import { cacheSiteDocumentImages } from './site-import-assets'
import {
  estimateVisualAiCostMicroeur,
  loadVisualPricing,
  SITE_IMPORT_COSTS,
  SITE_VISUAL_MAX_INPUT_TOKENS
} from './site-import-cost'
import { readBuilderPlan, readSourceMode } from './site-import-model'
import { reportSiteImportCapture, reportSiteImportProgress } from './site-import-progress'
import type { WorkerJob } from './worker-job'

/** Turn selected Figma frames and layer data into one normal private multi-page site revision. */
export async function processFigmaSiteImportJob(job: WorkerJob): Promise<void> {
  if (!job.builder_site_id) throw new Error('Figma import job has no website')
  const db = createServiceClient()
  const [{ data: site, error: siteError }, { data: source, error: sourceError }] =
    await Promise.all([
      db
        .from('cr_builder_sites')
        .select(
          'id,owner_id,source_url,source_mode,initial_instruction,initial_instruction_handled_at'
        )
        .eq('id', job.builder_site_id)
        .eq('owner_id', job.owner_id)
        .is('archived_at', null)
        .single(),
      db
        .from('cr_builder_figma_sources')
        .select('file_key,selected_node_ids,selected_screen_names')
        .eq('site_id', job.builder_site_id)
        .eq('owner_id', job.owner_id)
        .single()
    ])
  if (siteError || !site || sourceError || !source)
    throw new Error('The selected Figma source is unavailable')
  const reference = parseFigmaFileUrl(site.source_url)
  if (!reference || reference.fileKey !== source.file_key)
    throw new Error('The saved Figma design link is invalid')
  const selectedNodeIds = readStringArray(source.selected_node_ids)
  const selectedScreenNames = readStringArray(source.selected_screen_names)
  const selections = selectedNodeIds.flatMap((id, index) => {
    const name = selectedScreenNames[index]
    return name ? [{ id, name }] : []
  })
  if (selections.length === 0 || selections.length > 5)
    throw new Error('The selected Figma screens are invalid')
  const { data: subscription } = await db
    .from('cr_subscriptions')
    .select('plan_id')
    .eq('owner_id', site.owner_id)
    .maybeSingle()
  const plan = readBuilderPlan(subscription?.plan_id)
  const pageLimit = getBuilderPlanEntitlements(plan).pagesPerImport
  const selectedScreens = selections.slice(0, Math.min(5, pageLimit))
  const reservedCost =
    plan === 'agency' ? SITE_IMPORT_COSTS.studioReservation : SITE_IMPORT_COSTS.launchReservation

  await reportSiteImportProgress(job, {
    eventKey: 'starting',
    kind: 'progress',
    message: 'Connecting the selected Figma screens',
    progress: 8,
    stage: 'starting',
    title: 'Creation started',
    detail:
      'CodeRocket is reading only the frames you selected and preparing a private editable project.'
  })
  const { error: statusError } = await db
    .from('cr_builder_sites')
    .update({
      status: 'analyzing',
      status_message: 'Reading the selected Figma screens, layers, text, and colours',
      last_error: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', site.id)
    .eq('owner_id', site.owner_id)
  if (statusError) throw new Error(statusError.message)

  const accessToken = await loadFigmaAccessToken(db, site.owner_id)
  const figma = await readFigmaSelectedScreens(accessToken, reference, selectedScreens)
  if (figma.screens.length !== selectedScreens.length)
    throw new Error('One or more selected Figma screens are no longer available')
  await reportSiteImportProgress(job, {
    eventKey: 'pages-found',
    kind: 'progress',
    message: `Reading ${figma.screens.length} selected screen${figma.screens.length === 1 ? '' : 's'}`,
    progress: 18,
    stage: 'checking_pages',
    title:
      figma.screens.length === 1
        ? 'Selected screen found'
        : `${figma.screens.length} selected screens found`,
    detail:
      'Text, colours, images, spacing, and frame hierarchy are available as structured design data.',
    total: figma.screens.length
  })
  const navigation = figma.screens.map(screen => ({
    href: figmaNodeUrl(reference, screen.id),
    label: screen.name
  }))
  let blueprints = figma.screens.map(screen =>
    createFigmaScreenBlueprint({
      fileName: figma.fileName,
      imageFillUrls: figma.imageFillUrls,
      navigation,
      reference,
      screen
    })
  )
  const captures = await readFigmaCaptures(job, figma.screens)
  const refined = await refineFirstFigmaScreen(job, blueprints[0], captures[0], reservedCost)
  let visualAiCostMicroeur = refined.costMicroeur
  if (refined.blueprint) {
    blueprints = blueprints.map((blueprint, index) =>
      index === 0
        ? (refined.blueprint ?? blueprint)
        : refined.blueprint?.visualTheme
          ? applySiteVisualTheme(blueprint, refined.blueprint.visualTheme)
          : blueprint
    )
  } else {
    visualAiCostMicroeur = 0
  }
  const sourceMode = readSourceMode(site.source_mode)
  const paths = createFigmaScreenPaths(figma.screens.map(screen => screen.name))
  const capturedPages: Array<{ document: SiteDocument; path: string }> = blueprints.map(
    (blueprint, index) => ({
      document: createSiteDocument(blueprint, sourceMode),
      path: paths[index] ?? `/screen-${index + 1}`
    })
  )
  for (const [index, screen] of figma.screens.entries()) {
    await reportSiteImportProgress(job, {
      current: index + 1,
      eventKey: `page-${index + 1}`,
      kind: 'page',
      message:
        index + 1 === figma.screens.length
          ? 'Preparing your private preview'
          : `Recreating screen ${index + 2} of ${figma.screens.length}`,
      progress: 56 + Math.round(((index + 1) / figma.screens.length) * 30),
      stage: 'checking_pages',
      title: `${screen.name.slice(0, 90)} recreated`,
      detail: 'Its visible layers and content are now safe, editable sections.',
      total: figma.screens.length
    })
  }
  const homepage = capturedPages[0]?.document
  if (!homepage) throw new Error('Figma produced no editable screen')
  const siteDocument = await cacheSiteDocumentImages(
    db,
    createSiteBundleDocument(homepage, capturedPages, figma.screens.length, []),
    site.owner_id,
    site.id
  )
  const actualCost = capturedPages.length * SITE_IMPORT_COSTS.page + visualAiCostMicroeur
  if (actualCost > reservedCost)
    throw new Error('The Figma study reached its protected cost ceiling')
  await reportSiteImportProgress(job, {
    current: figma.screens.length,
    eventKey: 'saving',
    kind: 'progress',
    message: 'Preparing your private preview',
    progress: 94,
    stage: 'saving',
    title: 'Putting the first version together',
    detail: 'CodeRocket is checking the recreated pages and saving an editable private version.',
    total: figma.screens.length
  })
  const { error: settlementError } = await db.rpc('cr_settle_site_import', {
    p_site_id: site.id,
    p_job_id: job.id,
    p_succeeded: true,
    p_site_document: siteDocument,
    p_provider_cost_microeur: actualCost,
    p_error: ''
  })
  if (settlementError) throw new Error(settlementError.message)
  const initialInstructionStatus = await queueInitialInstruction(db, site)
  await db
    .from('cr_builder_sites')
    .update({
      status_message:
        initialInstructionStatus === 'queued'
          ? 'Your first version is ready · applying your extra request'
          : initialInstructionStatus === 'needs_retry'
            ? 'Your first version is ready · send the extra request again in the Studio'
            : `${capturedPages.length} Figma screen${capturedPages.length === 1 ? '' : 's'} ready`,
      updated_at: new Date().toISOString()
    })
    .eq('id', site.id)
    .eq('owner_id', site.owner_id)
  await reportSiteImportProgress(job, {
    current: figma.screens.length,
    eventKey: 'completed',
    kind: 'completed',
    message: 'Your first version is ready',
    progress: 100,
    stage: 'completed',
    title: 'Your private version is ready',
    detail:
      initialInstructionStatus === 'queued'
        ? 'The faithful Figma version is ready. Your optional request is now creating a separate recoverable version.'
        : `${capturedPages.length} selected screen${capturedPages.length === 1 ? ' is' : 's are'} ready to review and edit.`,
    total: figma.screens.length
  })
}

interface FigmaCapture {
  dataUrl: string
  height: number
  width: number
}

/** Download bounded JPEG renders for private progress previews and optional visual refinement. */
async function readFigmaCaptures(
  job: WorkerJob,
  screens: Array<{
    name: string
    node: { absoluteBoundingBox?: { height: number; width: number } }
    renderUrl?: string
  }>
): Promise<Array<FigmaCapture | undefined>> {
  const captures: Array<FigmaCapture | undefined> = []
  for (const [index, screen] of screens.entries()) {
    let capture: FigmaCapture | undefined
    if (screen.renderUrl) {
      const image = await fetchPublicImage(screen.renderUrl, { timeoutMs: 20_000 }).catch(
        () => undefined
      )
      if (image?.contentType === 'image/jpeg') {
        const dataUrl = `data:image/jpeg;base64,${Buffer.from(image.bytes).toString('base64')}`
        const bounds = screen.node.absoluteBoundingBox
        capture = {
          dataUrl,
          height: Math.round(bounds?.height ?? 900),
          width: Math.round(bounds?.width ?? 1_440)
        }
        await reportSiteImportCapture(job, {
          dataUrl,
          index: index + 1,
          name: 'figma',
          title: screen.name
        })
      }
    }
    captures.push(capture)
  }
  return captures
}

/** Use the first frame preview to refine layout while preserving the structured Figma content. */
async function refineFirstFigmaScreen(
  job: WorkerJob,
  blueprint: SiteSourceBlueprint | undefined,
  capture: FigmaCapture | undefined,
  reservedCost: number
): Promise<{ blueprint?: SiteSourceBlueprint; costMicroeur: number }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!(apiKey && blueprint && capture && capture.dataUrl.length <= 3_000_000))
    return { blueprint, costMicroeur: 0 }
  const db = createServiceClient()
  const visualModel =
    process.env.CODEROCKET_SITE_VISUAL_MODEL ??
    process.env.CODEROCKET_AI_MODEL ??
    DEFAULT_SITE_VISUAL_MODEL
  let providerRequestStarted = false
  try {
    await reportSiteImportProgress(job, {
      eventKey: 'visual-ai-started',
      kind: 'ai',
      message: 'Understanding the visual identity',
      progress: 46,
      stage: 'comparing',
      title: 'Design assistant is studying the first screen',
      detail: 'It is checking typography, spacing, colours, and layout without changing Figma text.'
    })
    const pricing = await loadVisualPricing(db, visualModel)
    const maximumCost = estimateVisualAiCostMicroeur(pricing, {
      cachedInputTokens: 0,
      inputTokens: SITE_VISUAL_MAX_INPUT_TOKENS,
      outputTokens: SITE_VISUAL_MAX_OUTPUT_TOKENS,
      reasoningTokens: 0,
      totalTokens: SITE_VISUAL_MAX_INPUT_TOKENS + SITE_VISUAL_MAX_OUTPUT_TOKENS
    })
    if (maximumCost + 5 * SITE_IMPORT_COSTS.page > reservedCost)
      throw new Error('The configured visual model exceeds the protected import budget')
    providerRequestStarted = true
    const result = await new OpenAiSiteVisualAnalysisProvider({
      apiKey,
      model: visualModel
    }).analyze({
      blueprint,
      captures: [{ ...capture, name: 'desktop' }],
      idempotencyKey: `coderocket-figma-visual-${job.id}`,
      safetyIdentifier: createHash('sha256').update(job.owner_id).digest('hex')
    })
    await reportSiteImportProgress(job, {
      eventKey: 'visual-ai-completed',
      kind: 'ai',
      message: 'Turning the design into editable sections',
      progress: 52,
      stage: 'comparing',
      title: 'Visual identity understood',
      detail: 'The shared type, colours, spacing, and layout are ready for the selected screens.'
    })
    return {
      blueprint: applySiteVisualRefinement(blueprint, result.refinement),
      costMicroeur: estimateVisualAiCostMicroeur(pricing, result.usage)
    }
  } catch {
    await reportSiteImportProgress(job, {
      eventKey: 'visual-figma-fallback',
      kind: 'warning',
      message: 'Continuing from the Figma layers',
      progress: 52,
      stage: 'comparing',
      title: 'Structured design data is ready',
      detail:
        'The optional image comparison could not finish, so CodeRocket is using Figma measurements.'
    })
    return {
      blueprint,
      costMicroeur: providerRequestStarted ? SITE_IMPORT_COSTS.failedVisualAi : 0
    }
  }
}

/** Narrow JSON arrays read from Supabase to the string values expected by Figma. */
function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

/** Queue the optional outcome only after the faithful Figma revision is durable. */
async function queueInitialInstruction(
  db: ReturnType<typeof createServiceClient>,
  site: {
    id: string
    initial_instruction: string | null
    initial_instruction_handled_at: string | null
    owner_id: string
  }
): Promise<'needs_retry' | 'none' | 'queued'> {
  if (!site.initial_instruction || site.initial_instruction_handled_at) return 'none'
  const { data: initialJobId, error } = await db.rpc('cr_queue_initial_site_instruction', {
    p_site_id: site.id
  })
  if (!error && typeof initialJobId === 'string') return 'queued'
  await db.from('cr_builder_messages').insert([
    {
      content: site.initial_instruction,
      credit_cost: 0,
      owner_id: site.owner_id,
      role: 'user',
      site_id: site.id,
      status: 'failed'
    },
    {
      content:
        'Your faithful first version is ready, but the extra request could not start automatically. No extra credits were used. Send it again from the Studio.',
      credit_cost: 0,
      owner_id: site.owner_id,
      role: 'assistant',
      site_id: site.id,
      status: 'failed'
    }
  ])
  await db
    .from('cr_builder_sites')
    .update({ initial_instruction_handled_at: new Date().toISOString() })
    .eq('id', site.id)
    .eq('owner_id', site.owner_id)
  return 'needs_retry'
}
