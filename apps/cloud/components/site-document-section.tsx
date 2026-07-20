import type { SiteDocument } from '@coderocket/core'
import { SiteDocumentCollection } from './site-document-collection'
import { resolvePublishedSiteHref } from './site-document-href'

type SiteSection = SiteDocument['sections'][number]

/** Render one bounded site section with its captured responsive visual system. */
export function SiteDocumentSection({
  document,
  index,
  publicBasePath,
  published,
  section
}: {
  document: SiteDocument
  index: number
  publicBasePath?: string
  published: boolean
  section: SiteSection
}) {
  const visual = section.visual
  const visualTheme = document.theme.visual
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
              ? `mx-auto max-w-3xl ${textAlignment}`
              : section.layout === 'split' && section.imageUrl && !usesBackgroundImage
                ? `grid @[720px]:grid-cols-2 items-center ${textAlignment}`
                : `max-w-4xl ${textAlignment}`
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
            {section.links.length > 0 ? (
              <div className="mt-8 flex flex-wrap gap-3">
                {section.links.map((link, linkIndex) => {
                  const primaryStyle =
                    linkIndex === 0
                      ? {
                          backgroundColor:
                            visualTheme?.button.style === 'outline'
                              ? 'transparent'
                              : (visualTheme?.button.backgroundColor ?? document.theme.accentColor),
                          borderColor:
                            visualTheme?.button.borderColor ?? document.theme.accentColor,
                          borderRadius: visualTheme?.button.radius,
                          color: visualTheme?.button.foregroundColor ?? '#ffffff'
                        }
                      : undefined
                  return published ? (
                    <a
                      className="inline-flex min-h-11 items-center border px-5 py-3 font-semibold text-sm"
                      href={resolvePublishedSiteHref(document, link.href, publicBasePath)}
                      key={`${link.href}-${link.label}`}
                      rel="noreferrer"
                      style={primaryStyle}
                    >
                      {link.label}
                    </a>
                  ) : (
                    <button
                      className="inline-flex min-h-11 items-center border px-5 py-3 font-semibold text-sm"
                      data-cr-select-key={`button-${section.id}-${linkIndex}`}
                      data-cr-select-kind="button"
                      data-cr-select-label={link.label}
                      data-cr-select-section={section.id}
                      key={`${link.href}-${link.label}`}
                      style={primaryStyle}
                      tabIndex={-1}
                      type="button"
                    >
                      {link.label}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
          {section.imageUrl && !usesBackgroundImage ? (
            <img
              alt={section.imageAlt ?? ''}
              className={
                visual?.imagePosition === 'before' && section.layout === 'split'
                  ? 'order-1 h-full w-full'
                  : 'h-full w-full'
              }
              height={900}
              data-cr-select-key={!published ? `image-${section.id}` : undefined}
              data-cr-select-kind={!published ? 'image' : undefined}
              data-cr-select-label={!published ? section.imageAlt || section.heading : undefined}
              data-cr-select-section={!published ? section.id : undefined}
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
          ) : null}
        </div>
        <SiteDocumentCollection
          document={document}
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
