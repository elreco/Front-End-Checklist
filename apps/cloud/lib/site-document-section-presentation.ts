import type { SiteDocument } from '@coderocket/core'
import type { CSSProperties } from 'react'

type SiteSection = SiteDocument['sections'][number]

interface SectionPresentation {
  bodyStyle?: CSSProperties
  contentStyle: CSSProperties
  gridClassName: string
  gridStyle: CSSProperties
  sectionStyle: CSSProperties
  sectionClassName?: string
  textOrderClassName?: string
  usesBackgroundImage: boolean
}

const ALIGNMENT_CLASSES = {
  center: {
    center: 'text-center',
    left: 'text-center @[720px]:text-left',
    right: 'text-center @[720px]:text-right'
  },
  left: {
    center: 'text-left @[720px]:text-center',
    left: 'text-left',
    right: 'text-left @[720px]:text-right'
  },
  right: {
    center: 'text-right @[720px]:text-center',
    left: 'text-right @[720px]:text-left',
    right: 'text-right'
  }
}

/** Derive stable classes and inline values from one captured section style. */
export function siteDocumentSectionPresentation(section: SiteSection): SectionPresentation {
  const visual = section.visual
  const usesBackgroundImage = visual?.imagePosition === 'background' && Boolean(section.imageUrl)
  const textAlignment = visual
    ? ALIGNMENT_CLASSES[visual.mobile.textAlign][visual.desktop.textAlign]
    : section.layout === 'centered'
      ? 'text-center'
      : 'text-left'
  return {
    bodyStyle: visual
      ? {
          fontSize: `clamp(${visual.mobile.bodySize}px, 2vw, ${visual.desktop.bodySize}px)`,
          lineHeight: visual.bodyLineHeight
        }
      : undefined,
    contentStyle: contentStyle(section),
    gridClassName: gridClassName(section, usesBackgroundImage, textAlignment),
    gridStyle: {
      gap: visual ? `clamp(${visual.mobile.gap}px, 6vw, ${visual.desktop.gap}px)` : undefined
    },
    sectionStyle: sectionStyle(section, usesBackgroundImage),
    sectionClassName: section.layout === 'centered' ? 'flex items-center' : undefined,
    textOrderClassName: visual?.imagePosition === 'before' ? 'order-2' : undefined,
    usesBackgroundImage
  }
}

/** Apply the captured surface, border, elevation, and background media. */
function sectionStyle(section: SiteSection, usesBackgroundImage: boolean): CSSProperties {
  const visual = section.visual
  let boxShadow: string | undefined
  if (visual?.elevation === 'strong') boxShadow = '0 24px 70px rgba(0, 0, 0, 0.18)'
  if (visual?.elevation === 'soft') boxShadow = '0 12px 36px rgba(0, 0, 0, 0.1)'
  return {
    backgroundColor: section.backgroundColor,
    backgroundImage: usesBackgroundImage
      ? `linear-gradient(rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.18)), url(${JSON.stringify(section.imageUrl)})`
      : visual?.backgroundImage || undefined,
    backgroundPosition: usesBackgroundImage ? 'center' : undefined,
    backgroundSize: usesBackgroundImage ? 'cover' : undefined,
    borderColor: visual?.borderColor,
    borderStyle: visual?.borderWidth ? 'solid' : undefined,
    borderWidth: visual?.borderWidth,
    boxShadow,
    color: section.foregroundColor
  }
}

/** Keep the measured content width and vertical rhythm responsive. */
function contentStyle(section: SiteSection): CSSProperties {
  const visual = section.visual
  if (!visual) return { maxWidth: 1152 }
  const padding = `clamp(${visual.mobile.paddingBlock}px, 8vw, ${visual.desktop.paddingBlock}px)`
  return {
    maxWidth: visual.desktop.contentWidth,
    width: `clamp(${visual.mobile.contentWidth}px, ${(visual.desktop.contentWidth / 14.4).toFixed(2)}cqw, ${visual.desktop.contentWidth}px)`,
    paddingBottom: padding,
    paddingTop: padding
  }
}

/** Choose the bounded layout class that matches the captured arrangement. */
function gridClassName(
  section: SiteSection,
  usesBackgroundImage: boolean,
  textAlignment: string
): string {
  if (section.layout === 'centered') return `mx-auto grid max-w-3xl ${textAlignment}`
  if (section.layout === 'split' && section.imageUrl && !usesBackgroundImage)
    return `grid @[720px]:grid-cols-2 items-center ${textAlignment}`
  return `grid max-w-4xl ${textAlignment}`
}
