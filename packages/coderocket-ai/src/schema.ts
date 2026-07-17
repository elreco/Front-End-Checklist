import { z } from 'zod'

export const aiAudienceSchema = z.enum(['site_owner', 'freelancer', 'developer'])
export type AiAudience = z.infer<typeof aiAudienceSchema>

export const aiFindingAnalysisSchema = z
  .object({
    summary: z.string().min(1).max(240),
    whyItMatters: z.string().min(1).max(500),
    diagnosis: z
      .object({
        observed: z.string().min(1).max(500),
        expected: z.string().min(1).max(500),
        confidence: z.enum(['high', 'medium', 'low']),
        limitations: z.array(z.string().min(1).max(240)).max(4)
      })
      .strict(),
    nextSteps: z
      .array(
        z
          .object({
            title: z.string().min(1).max(100),
            explanation: z.string().min(1).max(500),
            verification: z.string().min(1).max(350)
          })
          .strict()
      )
      .min(1)
      .max(5),
    likelyFiles: z
      .array(
        z
          .object({
            pattern: z.string().min(1).max(160),
            reason: z.string().min(1).max(300)
          })
          .strict()
      )
      .max(4),
    difficulty: z.enum(['quick', 'moderate', 'advanced']),
    brief: z.string().min(1).max(600),
    humanReviewRequired: z.literal(true)
  })
  .strict()

export type AiFindingAnalysis = z.infer<typeof aiFindingAnalysisSchema>
