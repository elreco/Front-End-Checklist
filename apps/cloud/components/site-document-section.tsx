import type { SiteDocument } from '@coderocket/core'
import type { BuilderConnectionSummary } from '@/lib/builder-connections'
import { siteDocumentSectionPresentation } from '@/lib/site-document-section-presentation'
import { siteDocumentSelection } from '@/lib/site-document-selection'
import { SiteDocumentActions } from './site-document-actions'
import { SiteDocumentCollection } from './site-document-collection'
import { SiteDocumentForm } from './site-document-form'
import { SiteDocumentHeading } from './site-document-heading'
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
  const presentation = siteDocumentSectionPresentation(section)
  return (
    <section
      className={presentation.sectionClassName}
      style={presentation.sectionStyle}
      {...siteDocumentSelection(
        published,
        `section-${section.id}`,
        'section',
        section.heading || section.imageAlt || 'Section',
        section.id
      )}
    >
      <div className="mx-auto @[640px]:px-10 px-6" style={presentation.contentStyle}>
        <div className={presentation.gridClassName} style={presentation.gridStyle}>
          <div className={presentation.textOrderClassName}>
            <SiteDocumentHeading index={index} published={published} section={section} />
            {section.body && (
              <p
                className="mt-6 max-w-2xl whitespace-pre-line"
                style={presentation.bodyStyle}
                {...siteDocumentSelection(
                  published,
                  `text-${section.id}`,
                  'text',
                  section.body.slice(0, 240),
                  section.id
                )}
              >
                {section.body}
              </p>
            )}
            <SiteDocumentForm published={published} section={section} />
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
            usesBackgroundImage={presentation.usesBackgroundImage}
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
