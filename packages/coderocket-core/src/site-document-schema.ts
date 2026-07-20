import { z } from 'zod'
import { siteFormSchema } from './site-form'
import { siteSectionVisualStyleSchema, siteVisualThemeSchema } from './site-visual-style'

const httpsUrlSchema = z
  .string()
  .url()
  .refine(value => value.startsWith('https://'))
const siteLinkSchema = z.object({
  href: httpsUrlSchema,
  label: z.string().trim().min(1).max(80),
  prominent: z.boolean().optional()
})
const siteContentItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,80}$/),
  title: z.string().trim().min(1).max(180),
  body: z.string().trim().max(500),
  imageAlt: z.string().trim().max(240).optional(),
  imageUrl: httpsUrlSchema.optional(),
  links: z.array(siteLinkSchema).max(2),
  price: z.string().trim().max(80).optional()
})
const siteSectionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,80}$/),
  kind: z.enum([
    'hero',
    'content',
    'features',
    'collection',
    'gallery',
    'testimonials',
    'pricing',
    'form',
    'cta'
  ]),
  heading: z.string().trim().max(180),
  body: z.string().trim().max(1200),
  imageAlt: z.string().trim().max(240).optional(),
  imageMobileWidth: z.number().int().min(24).max(1440).optional(),
  imageUrl: httpsUrlSchema.optional(),
  imageWidth: z.number().int().min(24).max(1440).optional(),
  items: z.array(siteContentItemSchema).max(12).optional(),
  links: z.array(siteLinkSchema).max(4),
  form: siteFormSchema.optional(),
  backgroundColor: z.string().max(80),
  foregroundColor: z.string().max(80),
  layout: z.enum(['centered', 'split', 'stacked']),
  visual: siteSectionVisualStyleSchema.optional()
})
const siteIdentitySchema = z.object({
  name: z.string().trim().min(1).max(120),
  logoUrl: httpsUrlSchema.optional(),
  showInHeader: z.boolean().optional()
})
const siteThemeSchema = z.object({
  backgroundColor: z.string().max(80),
  foregroundColor: z.string().max(80),
  accentColor: z.string().max(80),
  fontStyle: z.enum(['sans', 'editorial', 'technical']),
  visual: siteVisualThemeSchema.optional()
})
export const sitePageSchema = z.object({
  path: z
    .string()
    .regex(/^\/(?:[^?#\s]*)$/)
    .max(1024),
  title: z.string().trim().min(1).max(180),
  sections: z.array(siteSectionSchema).min(1).max(12),
  identity: siteIdentitySchema.optional(),
  theme: siteThemeSchema.optional(),
  navigation: z.array(siteLinkSchema).max(8).optional()
})

export const siteDocumentSchema = z.object({
  version: z.literal(1),
  source: z.object({
    url: httpsUrlSchema,
    mode: z.enum(['owned', 'inspiration']),
    capturedAt: z.iso.datetime()
  }),
  identity: siteIdentitySchema,
  theme: siteThemeSchema,
  navigation: z.array(siteLinkSchema).max(8),
  footer: z
    .object({
      links: z.array(siteLinkSchema).max(12),
      text: z.string().trim().max(240).optional()
    })
    .optional(),
  sections: z.array(siteSectionSchema).min(1).max(12),
  pages: z.array(sitePageSchema).min(1).max(50).optional(),
  importSummary: z
    .object({
      discoveredPages: z.number().int().min(1).max(200),
      capturedPages: z.number().int().min(1).max(50),
      failedPaths: z.array(z.string().max(1024)).max(50)
    })
    .optional(),
  recreation: z
    .object({
      capturedViewports: z
        .array(z.enum(['mobile', 'tablet', 'desktop']))
        .min(1)
        .max(3),
      visualAnalysis: z.enum(['responsive-ai', 'responsive-dom']),
      requiresReview: z.literal(true)
    })
    .optional()
})

export type SiteDocument = z.infer<typeof siteDocumentSchema>
export type SiteDocumentPage = z.infer<typeof sitePageSchema>
