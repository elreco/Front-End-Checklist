import type { SiteDocument } from '@coderocket/core'

type SiteSection = SiteDocument['sections'][number]

/** Render one captured section image without stretching illustrations into photographic crops. */
export function SiteDocumentImage({
  index,
  published,
  section,
  usesBackgroundImage
}: {
  index: number
  published: boolean
  section: SiteSection
  usesBackgroundImage: boolean
}) {
  if (!section.imageUrl || usesBackgroundImage) return null
  const visual = section.visual
  const measuredWidth = section.imageWidth
  const mobileWidth = section.imageMobileWidth ?? measuredWidth
  return (
    <img
      alt={section.imageAlt ?? ''}
      className={
        visual?.imagePosition === 'before'
          ? 'order-1 mx-auto max-w-full self-center'
          : section.layout === 'split'
            ? 'max-w-full self-center'
            : 'mx-auto max-w-full self-center'
      }
      data-cr-select-key={!published ? `image-${section.id}` : undefined}
      data-cr-select-kind={!published ? 'image' : undefined}
      data-cr-select-label={!published ? section.imageAlt || section.heading : undefined}
      data-cr-select-section={!published ? section.id : undefined}
      height={900}
      loading={index === 0 ? 'eager' : 'lazy'}
      referrerPolicy="no-referrer"
      src={section.imageUrl}
      style={{
        aspectRatio: visual?.imageAspectRatio,
        borderRadius: visual?.borderRadius,
        objectFit: visual?.imageFit ?? 'cover',
        width:
          measuredWidth && mobileWidth
            ? `clamp(${mobileWidth}px, ${(measuredWidth / 14.4).toFixed(2)}cqw, ${measuredWidth}px)`
            : '100%'
      }}
      width={1200}
    />
  )
}
