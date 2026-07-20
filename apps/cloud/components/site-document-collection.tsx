import type { SiteDocument } from '@coderocket/core'
import { resolvePublishedSiteHref } from './site-document-href'

type SiteSection = SiteDocument['sections'][number]

/** Render repeated products, projects, testimonials, or offers as one structured collection. */
export function SiteDocumentCollection({
  document,
  publicBasePath,
  published,
  section
}: {
  document: SiteDocument
  publicBasePath?: string
  published: boolean
  section: SiteSection
}) {
  if (!section.items?.length) return null
  const compact = section.kind === 'testimonials'
  return (
    <div
      className={`mt-10 grid gap-5 ${
        section.items.length === 2
          ? '@[720px]:grid-cols-2'
          : '@[640px]:grid-cols-2 @[960px]:grid-cols-3'
      }`}
    >
      {section.items.map(item => (
        <article
          className="overflow-hidden border"
          data-cr-select-item={!published ? item.id : undefined}
          data-cr-select-key={!published ? `item-${section.id}-${item.id}` : undefined}
          data-cr-select-kind={!published ? 'collection_item' : undefined}
          data-cr-select-label={!published ? item.title : undefined}
          data-cr-select-section={!published ? section.id : undefined}
          key={item.id}
          style={{
            backgroundColor: section.backgroundColor,
            borderColor: section.visual?.borderColor,
            borderRadius: section.visual?.borderRadius
          }}
        >
          {item.imageUrl && !compact ? (
            <img
              alt={item.imageAlt ?? ''}
              className="aspect-[4/3] w-full object-cover"
              height={720}
              loading="lazy"
              referrerPolicy="no-referrer"
              src={item.imageUrl}
              width={960}
            />
          ) : null}
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-semibold text-lg leading-tight">{item.title}</h3>
              {item.price ? <p className="shrink-0 font-semibold text-sm">{item.price}</p> : null}
            </div>
            {item.body ? <p className="mt-3 text-sm leading-6">{item.body}</p> : null}
            {item.links[0] ? (
              published ? (
                <a
                  className="mt-5 inline-flex min-h-10 items-center border px-4 py-2 font-semibold text-sm"
                  href={resolvePublishedSiteHref(document, item.links[0].href, publicBasePath)}
                  rel="noreferrer"
                  style={{ borderColor: document.theme.accentColor }}
                >
                  {item.links[0].label}
                </a>
              ) : (
                <button
                  className="mt-5 inline-flex min-h-10 items-center border px-4 py-2 font-semibold text-sm"
                  data-cr-select-item={item.id}
                  data-cr-select-key={`button-${section.id}-${item.id}`}
                  data-cr-select-kind="button"
                  data-cr-select-label={item.links[0].label}
                  data-cr-select-section={section.id}
                  style={{ borderColor: document.theme.accentColor }}
                  tabIndex={-1}
                  type="button"
                >
                  {item.links[0].label}
                </button>
              )
            ) : null}
          </div>
        </article>
      ))}
    </div>
  )
}
