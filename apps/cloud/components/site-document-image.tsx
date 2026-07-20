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
  return (
    <img
      alt={section.imageAlt ?? ''}
      className={
        visual?.imagePosition === 'before' && section.layout === 'split'
          ? 'order-1 w-full self-center'
          : 'w-full self-center'
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
        objectFit: visual?.imageFit ?? 'cover'
      }}
      width={1200}
    />
  )
}
