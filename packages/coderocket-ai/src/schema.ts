import { z } from 'zod'

export const aiAudienceSchema = z.enum(['site_owner', 'freelancer', 'developer'])
export type AiAudience = z.infer<typeof aiAudienceSchema>

const diagnosisSchema = z
  .object({
    observed: z.string().min(1).max(500),
    expected: z.string().min(1).max(500),
    confidence: z.enum(['high', 'medium', 'low']),
    limitations: z.array(z.string().min(1).max(240)).max(4)
  })
  .strict()

const likelyFilesSchema = z
  .array(
    z
      .object({
        pattern: z.string().min(1).max(160),
        reason: z.string().min(1).max(300)
      })
      .strict()
  )
  .max(4)

const audiencePresentationSchema = z
  .object({
    summary: z.string().min(1).max(180),
    whyItMatters: z.string().min(1).max(320),
    brief: z.string().min(1).max(450)
  })
  .strict()

const audienceGuidanceSchema = z
  .object({
    site_owner: z.string().min(1).max(220),
    freelancer: z.string().min(1).max(260),
    developer: z.string().min(1).max(320)
  })
  .strict()

export const legacyAiFindingAnalysisSchema = z
  .object({
    summary: z.string().min(1).max(240),
    whyItMatters: z.string().min(1).max(500),
    diagnosis: diagnosisSchema,
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
    likelyFiles: likelyFilesSchema,
    difficulty: z.enum(['quick', 'moderate', 'advanced']),
    brief: z.string().min(1).max(600),
    humanReviewRequired: z.literal(true)
  })
  .strict()

export const aiFindingAnalysisSchema = z
  .object({
    version: z.literal(2),
    diagnosis: diagnosisSchema,
    nextSteps: z
      .array(
        z
          .object({
            title: z.string().min(1).max(100),
            guidance: audienceGuidanceSchema,
            verification: z.string().min(1).max(350)
          })
          .strict()
      )
      .min(1)
      .max(4),
    likelyFiles: likelyFilesSchema,
    difficulty: z.enum(['quick', 'moderate', 'advanced']),
    presentations: z
      .object({
        site_owner: audiencePresentationSchema,
        freelancer: audiencePresentationSchema,
        developer: audiencePresentationSchema
      })
      .strict(),
    humanReviewRequired: z.literal(true)
  })
  .strict()

export const storedAiFindingAnalysisSchema = z.union([
  aiFindingAnalysisSchema,
  legacyAiFindingAnalysisSchema
])

export type AiFindingAnalysis = z.infer<typeof aiFindingAnalysisSchema>
export type LegacyAiFindingAnalysis = z.infer<typeof legacyAiFindingAnalysisSchema>
export type StoredAiFindingAnalysis = z.infer<typeof storedAiFindingAnalysisSchema>
