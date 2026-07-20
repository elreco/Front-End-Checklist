import type { SiteDocument } from '@coderocket/core'
import type { BuilderConnectionSummary } from '@/lib/builder-connections'
import { SiteDocumentActions } from './site-document-actions'
import { SiteDocumentCollection } from './site-document-collection'
import { SiteDocumentImage } from './site-document-image'

type SiteSection = SiteDocument['sections'][number]

/** Render one bounded site section with its captured responsive visual system. */
export function SiteDocumentSection({
  checkoutPath,
  connections,
  document,
  index,
  pagePath,
  publicBasePath,
  published,
  section
}: {
  checkoutPath?: string
  connections: BuilderConnectionSummary[]
  document: SiteDocument
  index: number
  pagePath: string
  publicBasePath?: string
  published: boolean
  section: SiteSection
}) {
  const visual = section.visual
  const usesBackgroundImage = visual?.imagePosition === 'background' && Boolean(section.imageUrl)
  const textAlignment = visual
    ? responsiveTextAlignment(visual.mobile.textAlign, visual.desktop.textAlign)
    : section.layout === 'centered'
      ? 'text-center'
      : 'text-left'
  return (
    <section
      data-cr-select-key={!published ? `section-${section.id}` : undefined}
      data-cr-select-kind={!published ? 'section' : undefined}
      data-cr-select-label={!published ? section.heading : undefined}
      data-cr-select-section={!published ? section.id : undefined}
      style={{
        backgroundColor: section.backgroundColor,
        backgroundImage: usesBackgroundImage
          ? `linear-gradient(rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.18)), url(${JSON.stringify(section.imageUrl)})`
          : visual?.backgroundImage || undefined,
        backgroundPosition: usesBackgroundImage ? 'center' : undefined,
        backgroundSize: usesBackgroundImage ? 'cover' : undefined,
        borderColor: visual?.borderColor,
        borderStyle: visual?.borderWidth ? 'solid' : undefined,
        borderWidth: visual?.borderWidth,
        boxShadow:
          visual?.elevation === 'strong'
            ? '0 24px 70px rgba(0, 0, 0, 0.18)'
            : visual?.elevation === 'soft'
              ? '0 12px 36px rgba(0, 0, 0, 0.1)'
              : undefined,
        color: section.foregroundColor
      }}
    >
      <div
        className="mx-auto @[640px]:px-10 px-6"
        style={{
          maxWidth: visual?.desktop.contentWidth ?? 1152,
          width: visual
            ? `clamp(${visual.mobile.contentWidth}px, ${(visual.desktop.contentWidth / 14.4).toFixed(2)}cqw, ${visual.desktop.contentWidth}px)`
            : undefined,
          paddingBottom: visual
            ? `clamp(${visual.mobile.paddingBlock}px, 8vw, ${visual.desktop.paddingBlock}px)`
            : undefined,
          paddingTop: visual
            ? `clamp(${visual.mobile.paddingBlock}px, 8vw, ${visual.desktop.paddingBlock}px)`
            : undefined
        }}
      >
        <div
          className={
            section.layout === 'centered'
              ? `mx-auto grid max-w-3xl ${textAlignment}`
              : section.layout === 'split' && section.imageUrl && !usesBackgroundImage
                ? `grid @[720px]:grid-cols-2 items-center ${textAlignment}`
                : `grid max-w-4xl ${textAlignment}`
          }
          style={{
            gap: visual ? `clamp(${visual.mobile.gap}px, 6vw, ${visual.desktop.gap}px)` : undefined
          }}
        >
          <div
            className={
              visual?.imagePosition === 'before' && section.layout === 'split'
                ? 'order-2'
                : undefined
            }
          >
            <SectionHeading index={index} published={published} section={section} />
            {section.body ? (
              <p
                className="mt-6 max-w-2xl whitespace-pre-line"
                data-cr-select-key={!published ? `text-${section.id}` : undefined}
                data-cr-select-kind={!published ? 'text' : undefined}
                data-cr-select-label={!published ? section.body.slice(0, 240) : undefined}
                data-cr-select-section={!published ? section.id : undefined}
                style={{
                  fontSize: visual
                    ? `clamp(${visual.mobile.bodySize}px, 2vw, ${visual.desktop.bodySize}px)`
                    : undefined,
                  lineHeight: visual?.bodyLineHeight
                }}
              >
                {section.body}
              </p>
            ) : null}
            <SiteDocumentActions
              connections={connections}
              document={document}
              publicBasePath={publicBasePath}
              published={published}
              section={section}
            />
          </div>
          <SiteDocumentImage
            index={index}
            published={published}
            section={section}
            usesBackgroundImage={usesBackgroundImage}
          />
        </div>
        <SiteDocumentCollection
          checkoutPath={checkoutPath}
          connections={connections}
          document={document}
          pagePath={pagePath}
          publicBasePath={publicBasePath}
          published={published}
          section={section}
        />
      </div>
    </section>
  )
}

/** Map measured mobile and desktop alignment to static responsive classes. */
function responsiveTextAlignment(
  mobile: 'left' | 'center' | 'right',
  desktop: 'left' | 'center' | 'right'
): string {
  if (mobile === 'center' && desktop === 'center') return 'text-center'
  if (mobile === 'right' && desktop === 'right') return 'text-right'
  if (mobile === 'left' && desktop === 'center') return 'text-left @[720px]:text-center'
  if (mobile === 'left' && desktop === 'right') return 'text-left @[720px]:text-right'
  if (mobile === 'center' && desktop === 'left') return 'text-center @[720px]:text-left'
  if (mobile === 'center' && desktop === 'right') return 'text-center @[720px]:text-right'
  if (mobile === 'right' && desktop === 'left') return 'text-right @[720px]:text-left'
  if (mobile === 'right' && desktop === 'center') return 'text-right @[720px]:text-center'
  return 'text-left'
}

/** Use one page heading followed by section headings while preserving captured typography. */
function SectionHeading({
  index,
  published,
  section
}: {
  index: number
  published: boolean
  section: SiteSection
}) {
  const visual = section.visual
  const className = visual
    ? index === 0
      ? 'max-w-4xl'
      : 'max-w-3xl'
    : index === 0
      ? 'max-w-4xl font-editorial text-5xl leading-[.92] tracking-[-.035em] sm:text-7xl'
      : 'max-w-3xl font-editorial text-4xl leading-[.96] tracking-[-.025em] sm:text-5xl'
  const style = visual
    ? {
        fontFamily: visual.headingFontFamily,
        fontSize: `clamp(${visual.mobile.headingSize}px, ${index === 0 ? 7 : 6}cqw, ${visual.desktop.headingSize}px)`,
        fontWeight: visual.headingFontWeight,
        letterSpacing: `${visual.headingLetterSpacing}px`,
        lineHeight: visual.headingLineHeight
      }
    : undefined
  return index === 0 ? (
    <h1
      className={className}
      data-cr-select-key={!published ? `heading-${section.id}` : undefined}
      data-cr-select-kind={!published ? 'heading' : undefined}
      data-cr-select-label={!published ? section.heading : undefined}
      data-cr-select-section={!published ? section.id : undefined}
      style={style}
    >
      {section.heading}
    </h1>
  ) : (
    <h2
      className={className}
      data-cr-select-key={!published ? `heading-${section.id}` : undefined}
      data-cr-select-kind={!published ? 'heading' : undefined}
      data-cr-select-label={!published ? section.heading : undefined}
      data-cr-select-section={!published ? section.id : undefined}
      style={style}
    >
      {section.heading}
    </h2>
  )
}
