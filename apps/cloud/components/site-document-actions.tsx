import type { SiteDocument } from '@coderocket/core'
import type { BuilderConnectionSummary } from '@/lib/builder-connections'
import { resolvePublishedSiteHref } from './site-document-href'

type SiteSection = SiteDocument['sections'][number]

/** Render captured section actions with the document's measured button treatment. */
export function SiteDocumentActions({
  connections,
  document,
  publicBasePath,
  published,
  section
}: {
  connections: BuilderConnectionSummary[]
  document: SiteDocument
  publicBasePath?: string
  published: boolean
  section: SiteSection
}) {
  const blockedUrls = new Set(
    connections.flatMap(connection =>
      connection.status !== 'connected' && connection.publicUrl ? [connection.publicUrl] : []
    )
  )
  const links = section.links.filter(link => !blockedUrls.has(link.href))
  if (links.length === 0) return null
  const button = document.theme.visual?.button
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      {links.map((link, linkIndex) => {
        const primaryStyle =
          linkIndex === 0
            ? {
                backgroundColor:
                  button?.style === 'outline'
                    ? 'transparent'
                    : (button?.backgroundColor ?? document.theme.accentColor),
                borderColor: button?.borderColor ?? document.theme.accentColor,
                borderRadius: button?.radius,
                color: button?.foregroundColor ?? '#ffffff'
              }
            : undefined
        const className = 'inline-flex min-h-11 items-center border px-5 py-3 font-semibold text-sm'
        return published ? (
          <a
            className={className}
            href={resolvePublishedSiteHref(document, link.href, publicBasePath)}
            key={`${link.href}-${link.label}`}
            rel="noreferrer"
            style={primaryStyle}
          >
            {link.label}
          </a>
        ) : (
          <button
            className={className}
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
  )
}
