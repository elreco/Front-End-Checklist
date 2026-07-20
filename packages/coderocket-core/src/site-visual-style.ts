import { z } from 'zod'
import type { SiteSourceBlueprint } from './site-document'

const visualColorSchema = z.string().trim().min(1).max(80)
const fontFamilySchema = z.string().trim().min(1).max(160)

export const responsiveSectionStyleSchema = z.object({
  contentWidth: z.number().int().min(320).max(1440),
  paddingBlock: z.number().int().min(16).max(240),
  headingSize: z.number().int().min(20).max(120),
  bodySize: z.number().int().min(12).max(32),
  gap: z.number().int().min(8).max(120),
  textAlign: z.enum(['left', 'center', 'right'])
})

export const siteSectionVisualStyleSchema = z.object({
  desktop: responsiveSectionStyleSchema,
  mobile: responsiveSectionStyleSchema,
  headingFontFamily: fontFamilySchema,
  headingFontWeight: z.number().int().min(100).max(900),
  headingLineHeight: z.number().min(0.75).max(2),
  headingLetterSpacing: z.number().min(-8).max(12),
  bodyLineHeight: z.number().min(1).max(2.5),
  borderRadius: z.number().int().min(0).max(80),
  borderWidth: z.number().int().min(0).max(4),
  borderColor: visualColorSchema,
  elevation: z.enum(['none', 'soft', 'strong']),
  imageAspectRatio: z.number().min(0.4).max(3),
  imageFit: z.enum(['cover', 'contain']),
  imagePosition: z.enum(['after', 'before', 'background']),
  backgroundImage: z.string().trim().max(500)
})

export const siteVisualThemeSchema = z.object({
  fontFamily: fontFamilySchema,
  headingFontFamily: fontFamilySchema,
  header: z.object({
    backgroundColor: visualColorSchema,
    foregroundColor: visualColorSchema,
    borderColor: visualColorSchema,
    height: z.number().int().min(48).max(120),
    position: z.enum(['static', 'sticky'])
  }),
  button: z.object({
    backgroundColor: visualColorSchema,
    foregroundColor: visualColorSchema,
    borderColor: visualColorSchema,
    radius: z.number().int().min(0).max(60),
    style: z.enum(['solid', 'outline', 'soft'])
  })
})

export const siteVisualRefinementSchema = z.object({
  theme: siteVisualThemeSchema,
  sections: z
    .array(
      z.object({
        index: z.number().int().min(0).max(11),
        layout: z.enum(['centered', 'split', 'stacked']),
        style: siteSectionVisualStyleSchema
      })
    )
    .max(12),
  confidence: z.enum(['low', 'medium', 'high']),
  limitations: z.array(z.string().trim().min(1).max(240)).max(8)
})

export type ResponsiveSectionStyle = z.infer<typeof responsiveSectionStyleSchema>
export type SiteSectionVisualStyle = z.infer<typeof siteSectionVisualStyleSchema>
export type SiteVisualTheme = z.infer<typeof siteVisualThemeSchema>
export type SiteVisualRefinement = z.infer<typeof siteVisualRefinementSchema>

/** Apply a schema-validated visual study without allowing it to alter source text, links, or media. */
export function applySiteVisualRefinement(
  blueprint: SiteSourceBlueprint,
  value: SiteVisualRefinement
): SiteSourceBlueprint {
  const refinement = siteVisualRefinementSchema.parse(value)
  const stylesBySection = new Map(refinement.sections.map(section => [section.index, section]))
  return {
    ...blueprint,
    sections: blueprint.sections.map((section, index) => {
      const refined = stylesBySection.get(index)
      if (!refined) return section
      return {
        ...section,
        layout: refined.layout,
        visual: {
          ...refined.style,
          imageAspectRatio: section.visual?.imageAspectRatio ?? refined.style.imageAspectRatio,
          imagePosition: section.visual?.imagePosition ?? refined.style.imagePosition
        }
      }
    }),
    visualAnalysis: 'responsive-ai',
    visualTheme: refinement.theme
  }
}

/** Reuse the homepage design system on secondary pages while retaining their measured geometry. */
export function applySiteVisualTheme(
  blueprint: SiteSourceBlueprint,
  theme: SiteVisualTheme
): SiteSourceBlueprint {
  return {
    ...blueprint,
    visualAnalysis: 'responsive-ai',
    visualTheme: siteVisualThemeSchema.parse(theme)
  }
}

/** Keep only CSS gradients that cannot load executable or third-party resources. */
export function sanitizeVisualBackground(value: string): string {
  const normalized = value.trim()
  if (normalized === 'none') return ''
  if (
    /^(?:linear-gradient|radial-gradient|conic-gradient)\(/i.test(normalized) &&
    !/url\s*\(/i.test(normalized)
  )
    return normalized.slice(0, 500)
  return ''
}

/** Keep captured font stacks useful while excluding CSS control characters. */
export function sanitizeFontFamily(value: string, fallback: string): string {
  const normalized = value
    .replaceAll(/[\n\r;{}]/g, '')
    .trim()
    .slice(0, 160)
  return normalized || fallback
}
