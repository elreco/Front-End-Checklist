import type { SiteDocument } from '@coderocket/core'
import type { CSSProperties, ElementType } from 'react'
import { siteDocumentSelection } from '@/lib/site-document-selection'

type SiteSection = SiteDocument['sections'][number]

/** Use one page heading followed by section headings while preserving captured typography. */
export function SiteDocumentHeading({
  index,
  published,
  section
}: {
  index: number
  published: boolean
  section: SiteSection
}) {
  if (!section.heading) return null
  const HeadingTag: ElementType = index === 0 ? 'h1' : 'h2'
  return (
    <HeadingTag
      className={headingClassName(section, index)}
      style={headingStyle(section, index)}
      {...siteDocumentSelection(
        published,
        `heading-${section.id}`,
        'heading',
        section.heading,
        section.id
      )}
    >
      {section.heading}
    </HeadingTag>
  )
}

/** Keep generated fallback typography separate from captured typography. */
function headingClassName(section: SiteSection, index: number): string {
  if (section.visual) return index === 0 ? 'max-w-4xl' : 'max-w-3xl'
  return index === 0
    ? 'max-w-4xl font-editorial text-5xl leading-[.92] tracking-[-.035em] sm:text-7xl'
    : 'max-w-3xl font-editorial text-4xl leading-[.96] tracking-[-.025em] sm:text-5xl'
}

/** Reapply the measured heading family, size, weight, spacing, and line height. */
function headingStyle(section: SiteSection, index: number): CSSProperties | undefined {
  const visual = section.visual
  if (!visual) return undefined
  return {
    fontFamily: visual.headingFontFamily,
    fontSize: `clamp(${visual.mobile.headingSize}px, ${index === 0 ? 7 : 6}cqw, ${visual.desktop.headingSize}px)`,
    fontWeight: visual.headingFontWeight,
    letterSpacing: `${visual.headingLetterSpacing}px`,
    lineHeight: visual.headingLineHeight
  }
}
