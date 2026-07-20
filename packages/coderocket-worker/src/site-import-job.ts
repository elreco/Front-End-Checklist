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
import { createServiceClient } from '@coderocket/db'
import type { WorkerJob } from './audit-job'

const PAGE_IMPORT_COST_MICROEUR = 5_000
const FAILED_IMPORT_COST_MICROEUR = 25_000

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
    const homepageBlueprint = await browser.captureSiteBlueprint(targets[0]?.url ?? site.source_url)
    const homepage = createSiteDocument(homepageBlueprint, sourceMode)
    const capturedPages: Array<{ document: SiteDocument; path: string }> = [
      { document: homepage, path: '/' }
    ]
    const failedPaths: string[] = []
    for (const target of targets.slice(1)) {
      await db
        .from('cr_builder_sites')
        .update({
          status_message: `Recreating page ${capturedPages.length + 1} of ${targets.length}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', site.id)
        .eq('owner_id', site.owner_id)
      try {
        const blueprint = await browser.captureSiteBlueprint(target.url)
        capturedPages.push({
          document: createSiteDocument(blueprint, sourceMode),
          path: target.path
        })
      } catch {
        failedPaths.push(target.path)
      }
    }
    const siteDocument = createSiteBundleDocument(
      homepage,
      capturedPages,
      Math.max(targets.length, discovery?.pages.length ?? 0),
      failedPaths
    )
    const actualCost = Math.min(
      plan === 'agency' ? 500_000 : 100_000,
      capturedPages.length * PAGE_IMPORT_COST_MICROEUR
    )
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
  } finally {
    await browser.close()
  }
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
}

function readSourceMode(value: string): SiteSourceMode {
  return value === 'inspiration' ? 'inspiration' : 'owned'
}

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
