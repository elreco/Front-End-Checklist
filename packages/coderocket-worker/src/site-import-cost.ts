import type { SiteVisualCaptureInput, SiteVisualTokenUsage } from '@coderocket/ai'
import type { createServiceClient } from '@coderocket/db'
import { z } from 'zod'

const BROWSER_RUNTIME_COST_MICROEUR_PER_MINUTE = 5_000
const USD_TO_EUR_SAFETY_BUFFER_BPS = 12_500
const visualPricingSchema = z.object({
  cached_input_microusd_per_million: z.number().nonnegative(),
  input_microusd_per_million: z.number().nonnegative(),
  output_microusd_per_million: z.number().nonnegative()
})

export const SITE_VISUAL_MAX_INPUT_TOKENS = 40_000
export const SITE_IMPORT_COSTS = {
  failedImport: 25_000,
  failedVisualAi: 75_000,
  launchReservation: 250_000,
  nextPageReserve: 15_000,
  page: 5_000,
  studioReservation: 750_000
}
type VisualPricing = z.infer<typeof visualPricingSchema>

/** Narrow transient captures to the two viewport names accepted by visual analysis. */
export function readVisualCaptures(
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
export async function loadVisualPricing(
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

/** Meter browser execution conservatively so long-running imports cannot hide infrastructure cost. */
export function estimateBrowserRuntimeCostMicroeur(startedAt: number, completedAt: number): number {
  const elapsedMilliseconds = Math.max(0, completedAt - startedAt)
  if (elapsedMilliseconds === 0) return 0
  return Math.ceil(elapsedMilliseconds / 60_000) * BROWSER_RUNTIME_COST_MICROEUR_PER_MINUTE
}

/** Validate the active database pricing snapshot before calculating provider cost. */
function readVisualPricing(value: unknown): VisualPricing {
  const parsed = visualPricingSchema.safeParse(value)
  if (!parsed.success) throw new Error('Visual AI pricing is unavailable')
  return parsed.data
}
