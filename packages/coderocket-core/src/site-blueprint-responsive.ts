import type { SiteSourceBlueprint, SourceSectionBlueprint } from './site-document'

/** Merge three inspected layouts by semantic content instead of fragile array position alone. */
export function mergeResponsiveBlueprints(
  desktop: SiteSourceBlueprint,
  tablet: SiteSourceBlueprint,
  mobile: SiteSourceBlueprint
): SiteSourceBlueprint {
  /** Find the corresponding responsive section even when one viewport hides a decorative block. */
  const matchingSection = (
    section: SourceSectionBlueprint,
    index: number,
    sections: SourceSectionBlueprint[]
  ) =>
    sections.find(
      candidate =>
        candidate.heading === section.heading &&
        candidate.body.slice(0, 160) === section.body.slice(0, 160)
    ) ?? sections[index]
  return {
    ...desktop,
    sections: desktop.sections.map((section, index) => {
      const tabletSection = matchingSection(section, index, tablet.sections)
      const mobileSection = matchingSection(section, index, mobile.sections)
      if (!section.visual) return section
      return {
        ...section,
        layout: section.layout ?? tabletSection?.layout ?? mobileSection?.layout,
        visual: {
          ...section.visual,
          desktop: section.visual.desktop,
          mobile:
            mobileSection?.visual?.mobile ?? tabletSection?.visual?.mobile ?? section.visual.mobile
        }
      }
    }),
    visualAnalysis: 'responsive-dom',
    visualTheme: desktop.visualTheme
  }
}
