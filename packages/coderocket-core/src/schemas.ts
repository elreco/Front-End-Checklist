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
  occurrenceKey: z.string().min(1).max(300).optional(),
  evidence: z
    .object({
      kind: z.enum(['html', 'header', 'network']),
      summary: z.string().min(1).max(2000),
      observed: z.string().max(4000).optional(),
      expected: z.string().max(4000).optional()
    })
    .optional()
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
        finalUrl: z.url({ protocol: /^https$/ }).optional(),
        document: z
          .object({
            byteLength: z.number().int().min(1).max(50_000_000),
            fetchedAt: z.iso.datetime(),
            htmlOutline: z.string().min(1).max(7000),
            sha256: z.string().regex(/^[a-f0-9]{64}$/),
            cacheStatus: z.string().max(1000).optional(),
            contentType: z.string().max(200).optional(),
            etag: z.string().max(500).optional(),
            lastModified: z.string().max(500).optional(),
            title: z.string().max(300).optional()
          })
          .optional(),
        socialImageUrl: z
          .url({ protocol: /^https$/ })
          .max(2048)
          .optional(),
        siteImageUrls: z
          .array(z.url({ protocol: /^https$/ }).max(2048))
          .max(12)
          .optional(),
        error: z.string().max(2000).optional()
      })
    )
    .min(1)
    .max(50)
})

export type ValidAuditSubmission = z.infer<typeof auditSubmissionSchema>
