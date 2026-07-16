import { z } from 'zod'

const findingSchema = z.object({
  pagePath: z.string().min(1).max(2048),
  ruleSlug: z.string().min(1).max(160),
  title: z.string().min(1).max(300),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  message: z.string().min(1).max(10_000),
  category: z
    .enum(['availability', 'search', 'accessibility', 'performance', 'security', 'quality'])
    .optional(),
  source: z.enum(['frontend_checklist', 'http']).optional(),
  occurrenceKey: z.string().min(1).max(300).optional()
})

export const auditSubmissionSchema = z.object({
  projectId: z.uuid().optional(),
  environment: z.enum(['production', 'preview']),
  trigger: z.enum(['manual', 'scheduled', 'ci']),
  rulesetVersion: z.string().min(1).max(120),
  commitSha: z.string().max(100).optional(),
  branch: z.string().max(255).optional(),
  pullRequest: z.string().max(100).optional(),
  pages: z
    .array(
      z.object({
        url: z.url({ protocol: /^https$/ }),
        reachable: z.boolean(),
        findings: z.array(findingSchema).max(5000),
        httpStatus: z.number().int().min(100).max(599).optional(),
        durationMs: z.number().int().min(0).max(120_000).optional(),
        error: z.string().max(2000).optional()
      })
    )
    .min(1)
    .max(50)
})

export type ValidAuditSubmission = z.infer<typeof auditSubmissionSchema>
