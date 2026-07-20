import { createHash } from 'node:crypto'
import {
  DEFAULT_SITE_VISUAL_MODEL,
  OpenAiSiteVisualAnalysisProvider,
  SITE_VISUAL_MAX_OUTPUT_TOKENS
} from '@coderocket/ai'
import {
  createSiteBundleDocument,
  createSiteDocument,
  discoverPublicPagePaths,
  discoverRenderedPagePaths,
  getBuilderPlanEntitlements,
  type SiteDocument,
  selectRepresentativePageTargets
} from '@coderocket/core'
import { BrowserCaptureSession } from '@coderocket/core/browser'
import { applySiteVisualRefinement } from '@coderocket/core/site-visual'
import { createServiceClient } from '@coderocket/db'
import { buildBrowserHandoffEndpoint, estimateBrowserHandoffCostMicroeur } from './browser-handoff'
import {
  clearBuilderImportAccess,
  loadBuilderHandoffCostMicroeur,
  loadBuilderImportAccess,
  markBuilderAccessVerified
} from './site-import-access'
import { cacheSiteDocumentImages } from './site-import-assets'
import {
  estimateBrowserRuntimeCostMicroeur,
  estimateVisualAiCostMicroeur,
  loadVisualPricing,
  readVisualCaptures,
  SITE_IMPORT_COSTS,
  SITE_VISUAL_MAX_INPUT_TOKENS
} from './site-import-cost'
import { sanitizeSiteImportFailure } from './site-import-failure'
import { processFigmaSiteImportJob } from './site-import-figma-job'
import { readablePageName, readBuilderPlan, readSourceMode } from './site-import-model'
import { isSameWebsiteCapture } from './site-import-origin'
import { reportSiteImportCapture, reportSiteImportProgress } from './site-import-progress'
import type { WorkerJob } from './worker-job'

/** Discover public or authorised screens and store one bounded, editable site-document revision. */
export async function processSiteImportJob(job: WorkerJob): Promise<void> {
  if (!job.builder_site_id) throw new Error('Website import job has no website')
  if (job.payload.sourceType === 'figma') return processFigmaSiteImportJob(job)
  const db = createServiceClient()
  const startedAt = Date.now()
  const { data: site, error } = await db
    .from('cr_builder_sites')
    .select('id,owner_id,source_url,source_mode,initial_instruction,initial_instruction_handled_at')
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
  const plan = readBuilderPlan(subscription?.plan_id)
  const pageLimit = getBuilderPlanEntitlements(plan).pagesPerImport
  const reservedCost =
    plan === 'agency' ? SITE_IMPORT_COSTS.studioReservation : SITE_IMPORT_COSTS.launchReservation
  const access = await loadBuilderImportAccess(db, site.id, site.owner_id)
  const handoffCostMicroeur = access.handoff
    ? estimateBrowserHandoffCostMicroeur(access.handoff)
    : 0
  const handoffCaptureReserveMicroeur = access.handoff
    ? access.handoff.costMicroeurPerMinute * 2
    : 0
  const visualCostBudget = Math.max(
    0,
    reservedCost -
      pageLimit * SITE_IMPORT_COSTS.page -
      handoffCostMicroeur -
      handoffCaptureReserveMicroeur
  )
  const sourceDescription = access.authenticated ? 'private app' : 'public website'

  await reportSiteImportProgress(job, {
    eventKey: 'starting',
    kind: 'progress',
    message: 'Getting everything ready',
    progress: 8,
    stage: 'starting',
    title: 'Creation started',
    detail: `CodeRocket is opening the ${sourceDescription} in a safe, isolated workspace.`
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

  const browser = new BrowserCaptureSession({
    login: access.login,
    remoteBrowserEndpoint: access.handoff ? buildBrowserHandoffEndpoint(access.handoff) : undefined,
    siteUrl: site.source_url
  })
  try {
    if (access.handoff) await browser.finishInteractiveHandoff(access.handoff.liveUrlId)
    const sourceMode = readSourceMode(site.source_mode)
    const authorisedSource = access.authenticated
      ? await browser.loadPage(site.source_url, true)
      : undefined
    if (authorisedSource) await markBuilderAccessVerified(db, site.id, site.owner_id)
    const discovery = access.authenticated
      ? undefined
      : await discoverPublicPagePaths(site.source_url).catch(() => undefined)
    const discoveredPaths = authorisedSource
      ? discoverRenderedPagePaths(authorisedSource.renderedHtml, authorisedSource.url)
      : (discovery?.pages.map(page => page.path) ?? [])
    const targets = selectRepresentativePageTargets(
      site.source_url,
      discoveredPaths,
      1,
      access.authenticated
    )
    await reportSiteImportProgress(job, {
      eventKey: 'pages-found',
      kind: 'progress',
      message: 'Checking the first screen on computer and phone',
      progress: 18,
      stage: 'checking_pages',
      title:
        targets.length === 1
          ? 'First screen selected'
          : `${targets.length} useful page types selected`,
      detail:
        targets.length === 1
          ? access.authenticated
            ? 'The first signed-in screen is ready to study.'
            : 'The page is public and ready to study.'
          : `CodeRocket chose ${targets.length} representative screens for a useful first version instead of copying every repeated URL.`,
      total: targets.length
    })
    const homepageStudy = await browser.captureSiteStudy(
      targets[0]?.url ?? site.source_url,
      true,
      capture =>
        capture.name === 'desktop' || capture.name === 'mobile'
          ? reportSiteImportCapture(job, {
              dataUrl: capture.dataUrl,
              name: capture.name
            })
          : Promise.resolve(),
      access.authenticated
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
        const remainingVisualBudget =
          visualCostBudget - estimateBrowserRuntimeCostMicroeur(startedAt, Date.now())
        if (maximumVisualCost > remainingVisualBudget)
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
        visualAiCostMicroeur = visualRequestStarted ? SITE_IMPORT_COSTS.failedVisualAi : 0
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
      { document: homepage, path: targets[0]?.path ?? '/' }
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
      title: 'First screen recreated',
      detail: 'Its visible content and layout are now safe, editable sections.',
      total: targets.length
    })
    const failedPaths: string[] = []
    for (const [index, target] of targets.slice(1).entries()) {
      const pageNumber = index + 2
      const costBeforePage =
        capturedPages.length * SITE_IMPORT_COSTS.page +
        visualAiCostMicroeur +
        (access.handoff ? estimateBrowserHandoffCostMicroeur(access.handoff) : 0) +
        estimateBrowserRuntimeCostMicroeur(startedAt, Date.now())
      if (
        costBeforePage + SITE_IMPORT_COSTS.page + SITE_IMPORT_COSTS.nextPageReserve >
        reservedCost
      ) {
        await reportSiteImportProgress(job, {
          current: capturedPages.length,
          eventKey: 'focused-first-version',
          kind: 'progress',
          message: 'Preparing your private preview',
          progress: 88,
          stage: 'checking_pages',
          title: 'The useful first version is complete',
          detail:
            'CodeRocket stopped after the representative pages that fit this creation, instead of spending credits on repeated URLs.',
          total: targets.length
        })
        break
      }
      await db
        .from('cr_builder_sites')
        .update({
          status_message: `Recreating page ${pageNumber} of ${targets.length}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', site.id)
        .eq('owner_id', site.owner_id)
      try {
        const capturedBlueprint = await browser.captureSiteBlueprint(
          target.url,
          access.authenticated
        )
        if (
          !isSameWebsiteCapture(
            site.source_url,
            homepageBlueprint.sourceUrl,
            capturedBlueprint.sourceUrl
          )
        )
          throw new Error('The page opened a different website')
        capturedPages.push({
          document: createSiteDocument(capturedBlueprint, sourceMode),
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
    const siteDocument = await cacheSiteDocumentImages(
      db,
      createSiteBundleDocument(
        homepage,
        capturedPages,
        Math.max(targets.length, discoveredPaths.length),
        failedPaths
      ),
      site.owner_id,
      site.id
    )
    const actualCost =
      capturedPages.length * SITE_IMPORT_COSTS.page +
      visualAiCostMicroeur +
      (access.handoff ? estimateBrowserHandoffCostMicroeur(access.handoff) : 0) +
      estimateBrowserRuntimeCostMicroeur(startedAt, Date.now())
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
    let initialInstructionStatus: 'none' | 'queued' | 'needs_retry' = 'none'
    if (site.initial_instruction && !site.initial_instruction_handled_at) {
      const { data: initialJobId, error: initialInstructionError } = await db.rpc(
        'cr_queue_initial_site_instruction',
        { p_site_id: site.id }
      )
      if (initialInstructionError) {
        initialInstructionStatus = 'needs_retry'
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
      } else {
        initialInstructionStatus = typeof initialJobId === 'string' ? 'queued' : 'needs_retry'
      }
    }
    await db
      .from('cr_builder_sites')
      .update({
        status_message:
          initialInstructionStatus === 'queued'
            ? 'Your first version is ready · applying your extra request'
            : initialInstructionStatus === 'needs_retry'
              ? 'Your first version is ready · send the extra request again in the Studio'
              : failedPaths.length > 0
                ? `${capturedPages.length} useful page types ready · ${failedPaths.length} could not be opened`
                : `${capturedPages.length} useful page types ready`,
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
        initialInstructionStatus === 'queued'
          ? 'The faithful first version is ready. Your optional request is now creating a separate recoverable version.'
          : failedPaths.length > 0
            ? `${capturedPages.length} pages are ready. ${failedPaths.length} unavailable page${failedPaths.length === 1 ? ' was' : 's were'} clearly skipped.`
            : `${capturedPages.length} page${capturedPages.length === 1 ? ' is' : 's are'} ready to review and edit.`,
      total: targets.length
    })
    await clearBuilderImportAccess(db, site.id, site.owner_id, true).catch(() => undefined)
  } finally {
    await browser.close()
  }
}

/** Release a terminal import reservation and expose a safe recovery message to its owner. */
export async function failSiteImportJob(job: WorkerJob, errorMessage: string): Promise<void> {
  if (!job.builder_site_id) return
  const db = createServiceClient()
  const safeErrorMessage = sanitizeSiteImportFailure(errorMessage)
  const handoffCostMicroeur = await loadBuilderHandoffCostMicroeur(
    db,
    job.builder_site_id,
    job.owner_id
  ).catch(() => 0)
  const { error } = await db.rpc('cr_settle_site_import', {
    p_site_id: job.builder_site_id,
    p_job_id: job.id,
    p_succeeded: false,
    p_site_document: {},
    p_provider_cost_microeur: SITE_IMPORT_COSTS.failedImport + handoffCostMicroeur,
    p_error: safeErrorMessage
  })
  if (error) throw new Error(error.message)
  await clearBuilderImportAccess(
    db,
    job.builder_site_id,
    job.owner_id,
    false,
    safeErrorMessage
  ).catch(() => undefined)
  await reportSiteImportProgress(job, {
    eventKey: 'failed',
    kind: 'failed',
    message: 'The first version could not be completed',
    progress: 100,
    stage: 'completed',
    title: 'Creation stopped safely',
    detail:
      'CodeRocket could not finish this source after several attempts. Nothing was published.',
    total: 0
  })
}
