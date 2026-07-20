import { createHash } from 'node:crypto'
import {
  DEFAULT_SITE_VISUAL_MODEL,
  OpenAiSiteVisualAnalysisProvider,
  SITE_VISUAL_MAX_OUTPUT_TOKENS,
  type SiteVisualCaptureInput,
  type SiteVisualTokenUsage
} from '@coderocket/ai'
import {
  createSiteBundleDocument,
  createSiteDocument,
  discoverPublicPagePaths,
  getBuilderPlanEntitlements,
  type PlanId,
  type SiteDocument,
  type SiteSourceMode
} from '@coderocket/core'
import { BrowserAuditSession } from '@coderocket/core/browser'
import { applySiteVisualRefinement, applySiteVisualTheme } from '@coderocket/core/site-visual'
import { createServiceClient } from '@coderocket/db'
import { z } from 'zod'
import type { WorkerJob } from './audit-job'
import { reportSiteImportCapture, reportSiteImportProgress } from './site-import-progress'

const PAGE_IMPORT_COST_MICROEUR = 5_000
const FAILED_IMPORT_COST_MICROEUR = 25_000
const FAILED_VISUAL_AI_COST_MICROEUR = 75_000
const LAUNCH_IMPORT_RESERVATION_MICROEUR = 250_000
const STUDIO_IMPORT_RESERVATION_MICROEUR = 750_000
const SITE_VISUAL_MAX_INPUT_TOKENS = 40_000
const USD_TO_EUR_SAFETY_BUFFER_BPS = 12_500
const visualPricingSchema = z.object({
  cached_input_microusd_per_million: z.number().nonnegative(),
  input_microusd_per_million: z.number().nonnegative(),
  output_microusd_per_million: z.number().nonnegative()
})

/** Discover public pages and store one bounded, editable multi-page site-document revision. */
export async function processSiteImportJob(job: WorkerJob): Promise<void> {
  if (!job.builder_site_id) throw new Error('Website import job has no website')
  const db = createServiceClient()
  const { data: site, error } = await db
    .from('cr_builder_sites')
    .select('id,owner_id,source_url,source_mode')
    .eq('id', job.builder_site_id)
    .eq('owner_id', job.owner_id)
    .is('archived_at', null)
    .single()
  if (error || !site) throw new Error('Website import is unavailable')
  const { data: subscription } = await db
    .from('cr_subscriptions')
    .select('plan_id')
    .eq('owner_id', site.owner_id)
    .maybeSingle()
  const plan = readPlan(subscription?.plan_id)
  const pageLimit = getBuilderPlanEntitlements(plan).pagesPerImport
  const reservedCost =
    plan === 'agency' ? STUDIO_IMPORT_RESERVATION_MICROEUR : LAUNCH_IMPORT_RESERVATION_MICROEUR
  const visualCostBudget = Math.max(0, reservedCost - pageLimit * PAGE_IMPORT_COST_MICROEUR)

  await reportSiteImportProgress(job, {
    eventKey: 'starting',
    kind: 'progress',
    message: 'Getting everything ready',
    progress: 8,
    stage: 'starting',
    title: 'Creation started',
    detail: 'CodeRocket is opening the public website in a safe, private workspace.'
  })
  const { error: progressError } = await db
    .from('cr_builder_sites')
    .update({
      status: 'analyzing',
      status_message: 'Studying the page, its sections, and its visual identity',
      last_error: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', site.id)
    .eq('owner_id', site.owner_id)
  if (progressError) throw new Error(progressError.message)

  const browser = new BrowserAuditSession({ siteUrl: site.source_url })
  try {
    const sourceMode = readSourceMode(site.source_mode)
    const discovery = await discoverPublicPagePaths(site.source_url).catch(() => undefined)
    const targets = buildPageTargets(
      site.source_url,
      discovery?.pages.map(page => page.path) ?? [],
      pageLimit
    )
    await reportSiteImportProgress(job, {
      eventKey: 'pages-found',
      kind: 'progress',
      message: 'Opening the visible pages',
      progress: 18,
      stage: 'checking_pages',
      title: targets.length === 1 ? 'Homepage found' : `${targets.length} pages found`,
      detail:
        targets.length === 1
          ? 'The homepage is public and ready to study.'
          : `CodeRocket found ${targets.length} public pages to recreate in this first version.`,
      total: targets.length
    })
    const homepageStudy = await browser.captureSiteStudy(targets[0]?.url ?? site.source_url)
    await Promise.all(
      homepageStudy.captures.flatMap(capture =>
        capture.name === 'desktop' || capture.name === 'mobile'
          ? [
              reportSiteImportCapture(job, {
                dataUrl: capture.dataUrl,
                name: capture.name
              })
            ]
          : []
      )
    )
    let homepageBlueprint = homepageStudy.blueprint
    let visualAiCostMicroeur = 0
    const visualModel =
      process.env.CODEROCKET_SITE_VISUAL_MODEL ??
      process.env.CODEROCKET_AI_MODEL ??
      DEFAULT_SITE_VISUAL_MODEL
    const apiKey = process.env.OPENAI_API_KEY
    if (apiKey) {
      let visualRequestStarted = false
      try {
        await reportSiteImportProgress(job, {
          eventKey: 'visual-ai-started',
          kind: 'ai',
          message: 'Understanding the visual identity',
          progress: 40,
          stage: 'comparing',
          title: 'Design assistant is studying the page',
          detail:
            'It is comparing the computer and phone views to understand typography, spacing, colours, and layout.'
        })
        const visualPricing = await loadVisualPricing(db, visualModel)
        const maximumVisualCost = estimateVisualAiCostMicroeur(visualPricing, {
          cachedInputTokens: 0,
          inputTokens: SITE_VISUAL_MAX_INPUT_TOKENS,
          outputTokens: SITE_VISUAL_MAX_OUTPUT_TOKENS,
          reasoningTokens: 0,
          totalTokens: SITE_VISUAL_MAX_INPUT_TOKENS + SITE_VISUAL_MAX_OUTPUT_TOKENS
        })
        if (maximumVisualCost > visualCostBudget)
          throw new Error('The configured visual model exceeds the protected import budget')
        await db
          .from('cr_builder_sites')
          .update({
            status_message: 'Comparing the computer and mobile versions',
            updated_at: new Date().toISOString()
          })
          .eq('id', site.id)
          .eq('owner_id', site.owner_id)
        const provider = new OpenAiSiteVisualAnalysisProvider({ apiKey, model: visualModel })
        visualRequestStarted = true
        const visualResult = await provider.analyze({
          blueprint: homepageBlueprint,
          captures: readVisualCaptures(homepageStudy.captures),
          idempotencyKey: `coderocket-site-visual-${job.id}`,
          safetyIdentifier: createHash('sha256').update(job.owner_id).digest('hex')
        })
        homepageBlueprint = applySiteVisualRefinement(homepageBlueprint, visualResult.refinement)
        visualAiCostMicroeur = estimateVisualAiCostMicroeur(visualPricing, visualResult.usage)
        await reportSiteImportProgress(job, {
          eventKey: 'visual-ai-completed',
          kind: 'ai',
          message: 'Turning the design into editable sections',
          progress: 50,
          stage: 'comparing',
          title: 'Visual identity understood',
          detail:
            'The main type, colours, spacing, and responsive behaviour are ready to reuse across the recreated pages.'
        })
      } catch {
        visualAiCostMicroeur = visualRequestStarted ? FAILED_VISUAL_AI_COST_MICROEUR : 0
        await db
          .from('cr_builder_sites')
          .update({
            status_message: 'Finishing from the measured responsive layout',
            updated_at: new Date().toISOString()
          })
          .eq('id', site.id)
          .eq('owner_id', site.owner_id)
        await reportSiteImportProgress(job, {
          eventKey: 'visual-measurements-fallback',
          kind: 'warning',
          message: 'Continuing from the measured layout',
          progress: 50,
          stage: 'comparing',
          title: 'Responsive measurements are ready',
          detail:
            'The optional design comparison could not finish, so CodeRocket is using the measured layout instead.'
        })
      }
    } else {
      await reportSiteImportProgress(job, {
        eventKey: 'visual-measurements-ready',
        kind: 'progress',
        message: 'Turning the design into editable sections',
        progress: 50,
        stage: 'comparing',
        title: 'Responsive layout measured',
        detail:
          'CodeRocket measured the typography, colours, spacing, and layout directly from the visible page.'
      })
    }
    const homepage = createSiteDocument(homepageBlueprint, sourceMode)
    const capturedPages: Array<{ document: SiteDocument; path: string }> = [
      { document: homepage, path: '/' }
    ]
    await reportSiteImportProgress(job, {
      current: 1,
      eventKey: 'page-1',
      kind: 'page',
      message:
        targets.length === 1
          ? 'Preparing your private preview'
          : `Recreating page 2 of ${targets.length}`,
      progress: 58,
      stage: 'checking_pages',
      title: 'Homepage recreated',
      detail: 'Its visible content and layout are now safe, editable sections.',
      total: targets.length
    })
    const failedPaths: string[] = []
    for (const [index, target] of targets.slice(1).entries()) {
      const pageNumber = index + 2
      await db
        .from('cr_builder_sites')
        .update({
          status_message: `Recreating page ${pageNumber} of ${targets.length}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', site.id)
        .eq('owner_id', site.owner_id)
      try {
        const capturedBlueprint = await browser.captureSiteBlueprint(target.url)
        const blueprint = homepageBlueprint.visualTheme
          ? applySiteVisualTheme(capturedBlueprint, homepageBlueprint.visualTheme)
          : capturedBlueprint
        capturedPages.push({
          document: createSiteDocument(blueprint, sourceMode),
          path: target.path
        })
        await reportSiteImportProgress(job, {
          current: pageNumber,
          eventKey: `page-${pageNumber}`,
          kind: 'page',
          message:
            pageNumber === targets.length
              ? 'Preparing your private preview'
              : `Recreating page ${pageNumber + 1} of ${targets.length}`,
          progress: 58 + Math.round((pageNumber / targets.length) * 27),
          stage: 'checking_pages',
          title: `Page ${pageNumber} recreated`,
          detail: `${readablePageName(target.path)} is ready as editable sections.`,
          total: targets.length
        })
      } catch {
        failedPaths.push(target.path)
        await reportSiteImportProgress(job, {
          current: pageNumber,
          eventKey: `page-${pageNumber}-skipped`,
          kind: 'warning',
          message:
            pageNumber === targets.length
              ? 'Preparing your private preview'
              : `Recreating page ${pageNumber + 1} of ${targets.length}`,
          progress: 58 + Math.round((pageNumber / targets.length) * 27),
          stage: 'checking_pages',
          title: `Page ${pageNumber} skipped`,
          detail: `${readablePageName(target.path)} could not be opened, so the rest of the website is continuing safely.`,
          total: targets.length
        })
      }
    }
    const siteDocument = createSiteBundleDocument(
      homepage,
      capturedPages,
      Math.max(targets.length, discovery?.pages.length ?? 0),
      failedPaths
    )
    const actualCost = capturedPages.length * PAGE_IMPORT_COST_MICROEUR + visualAiCostMicroeur
    if (actualCost > reservedCost)
      throw new Error('The website study reached its protected cost ceiling')
    await reportSiteImportProgress(job, {
      current: targets.length,
      eventKey: 'saving',
      kind: 'progress',
      message: 'Preparing your private preview',
      progress: 94,
      stage: 'saving',
      title: 'Putting the first version together',
      detail: 'CodeRocket is checking the recreated pages and saving an editable private version.',
      total: targets.length
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
    await db
      .from('cr_builder_sites')
      .update({
        status_message:
          failedPaths.length > 0
            ? `${capturedPages.length} pages ready · ${failedPaths.length} could not be opened`
            : `${capturedPages.length} pages recreated`,
        updated_at: new Date().toISOString()
      })
      .eq('id', site.id)
      .eq('owner_id', site.owner_id)
    await reportSiteImportProgress(job, {
      current: targets.length,
      eventKey: 'completed',
      kind: 'completed',
      message: 'Your first version is ready',
      progress: 100,
      stage: 'completed',
      title: 'Your private version is ready',
      detail:
        failedPaths.length > 0
          ? `${capturedPages.length} pages are ready. ${failedPaths.length} unavailable page${failedPaths.length === 1 ? ' was' : 's were'} clearly skipped.`
          : `${capturedPages.length} page${capturedPages.length === 1 ? ' is' : 's are'} ready to review and edit.`,
      total: targets.length
    })
  } finally {
    await browser.close()
  }
}

type VisualPricing = z.infer<typeof visualPricingSchema>

/** Narrow transient captures to the two viewport names accepted by visual analysis. */
function readVisualCaptures(
  captures: Array<{ dataUrl: string; height: number; name: string; width: number }>
): SiteVisualCaptureInput[] {
  return captures.flatMap(capture =>
    capture.name === 'desktop' || capture.name === 'mobile'
      ? [
          {
            dataUrl: capture.dataUrl,
            height: capture.height,
            name: capture.name,
            width: capture.width
          }
        ]
      : []
  )
}

/** Load the active model price before sending any screenshots to the provider. */
async function loadVisualPricing(
  db: ReturnType<typeof createServiceClient>,
  model: string
): Promise<VisualPricing> {
  const { data, error } = await db
    .from('cr_ai_model_pricing')
    .select(
      'input_microusd_per_million,cached_input_microusd_per_million,output_microusd_per_million'
    )
    .eq('model', model)
    .eq('active', true)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return readVisualPricing(data)
}

/** Price metered visual-analysis tokens with a conservative currency-conversion buffer. */
export function estimateVisualAiCostMicroeur(
  pricing: VisualPricing,
  usage: SiteVisualTokenUsage
): number {
  const cachedTokens = Math.min(usage.inputTokens, Math.max(0, usage.cachedInputTokens))
  const uncachedTokens = Math.max(0, usage.inputTokens - cachedTokens)
  const providerCostMicrousd = Math.ceil(
    (uncachedTokens * pricing.input_microusd_per_million +
      cachedTokens * pricing.cached_input_microusd_per_million +
      Math.max(0, usage.outputTokens) * pricing.output_microusd_per_million) /
      1_000_000
  )
  return Math.ceil((providerCostMicrousd * USD_TO_EUR_SAFETY_BUFFER_BPS) / 10_000)
}

/** Validate the active database pricing snapshot before calculating provider cost. */
function readVisualPricing(value: unknown): VisualPricing {
  const parsed = visualPricingSchema.safeParse(value)
  if (!parsed.success) throw new Error('Visual AI pricing is unavailable')
  return parsed.data
}

/** Release a terminal import reservation and expose a safe recovery message to its owner. */
export async function failSiteImportJob(job: WorkerJob, errorMessage: string): Promise<void> {
  if (!job.builder_site_id) return
  const { error } = await createServiceClient().rpc('cr_settle_site_import', {
    p_site_id: job.builder_site_id,
    p_job_id: job.id,
    p_succeeded: false,
    p_site_document: {},
    p_provider_cost_microeur: FAILED_IMPORT_COST_MICROEUR,
    p_error: errorMessage
  })
  if (error) throw new Error(error.message)
  await reportSiteImportProgress(job, {
    eventKey: 'failed',
    kind: 'failed',
    message: 'The first version could not be completed',
    progress: 100,
    stage: 'completed',
    title: 'Creation stopped safely',
    detail:
      'CodeRocket could not finish this public website after several attempts. Nothing was published.',
    total: 0
  })
}

/** Normalize stored source permission to the two supported recreation modes. */
function readSourceMode(value: string): SiteSourceMode {
  return value === 'inspiration' ? 'inspiration' : 'owned'
}

/** Keep unknown or missing subscriptions on the non-billable free plan. */
function readPlan(value?: string): PlanId {
  if (value === 'agency' || value === 'solo') return value
  return 'free'
}

/** Map the entered page to public root and add bounded, unique same-origin discovered pages. */
function buildPageTargets(
  sourceUrl: string,
  discoveredPaths: string[],
  limit: number
): Array<{ path: string; url: string }> {
  const source = new URL(sourceUrl)
  const targets = [{ path: '/', url: source.toString() }]
  const seenPaths = new Set<string>(['/', source.pathname])
  for (const path of discoveredPaths) {
    if (targets.length >= Math.max(1, limit) || seenPaths.has(path)) continue
    seenPaths.add(path)
    targets.push({ path, url: new URL(path, source.origin).toString() })
  }
  return targets
}

/** Turn one public path into a short label that remains understandable outside technical details. */
function readablePageName(path: string): string {
  if (path === '/') return 'The homepage'
  const lastPart = path.split('/').filter(Boolean).at(-1) ?? 'This page'
  const label = lastPart.replace(/[-_]+/g, ' ').trim()
  return label ? `“${label.slice(0, 60)}”` : 'This page'
}
