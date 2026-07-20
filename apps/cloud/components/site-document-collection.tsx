import type { SiteDocument } from '@coderocket/core'
import { readBuilderPrice } from '@/lib/builder-commerce'
import type { BuilderConnectionSummary } from '@/lib/builder-connections'
import { resolvePublishedSiteHref } from './site-document-href'

type SiteSection = SiteDocument['sections'][number]

/** Render repeated products, projects, testimonials, or offers as one structured collection. */
export function SiteDocumentCollection({
  checkoutPath,
  connections,
  document,
  pagePath,
  publicBasePath,
  published,
  section
}: {
  checkoutPath?: string
  connections: BuilderConnectionSummary[]
  document: SiteDocument
  pagePath: string
  publicBasePath?: string
  published: boolean
  section: SiteSection
}) {
  if (!section.items?.length) return null
  const compact = section.kind === 'testimonials'
  const blockedUrls = new Set(
    connections.flatMap(connection =>
      connection.status !== 'connected' && connection.publicUrl ? [connection.publicUrl] : []
    )
  )
  return (
    <div
      className={`mt-10 grid gap-5 ${
        section.items.length === 2
          ? '@[720px]:grid-cols-2'
          : '@[640px]:grid-cols-2 @[960px]:grid-cols-3'
      }`}
    >
      {section.items.map(item => {
        const payment = resolveItemPayment(connections, pagePath, section.id, item)
        const itemLink = item.links.find(link => !blockedUrls.has(link.href))
        return (
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
              {payment?.mode === 'account' ? (
                published && checkoutPath ? (
                  <form action={checkoutPath} method="post">
                    <input name="pagePath" type="hidden" value={pagePath} />
                    <input name="sectionId" type="hidden" value={section.id} />
                    <input name="itemId" type="hidden" value={item.id} />
                    <button
                      className="mt-5 inline-flex min-h-10 items-center border px-4 py-2 font-semibold text-sm"
                      style={{ borderColor: document.theme.accentColor }}
                      type="submit"
                    >
                      {itemLink?.label ?? 'Buy now'}
                    </button>
                  </form>
                ) : (
                  <button
                    className="mt-5 inline-flex min-h-10 items-center border px-4 py-2 font-semibold text-sm"
                    data-cr-select-item={item.id}
                    data-cr-select-key={`button-${section.id}-${item.id}`}
                    data-cr-select-kind={!published ? 'button' : undefined}
                    data-cr-select-label={!published ? (itemLink?.label ?? 'Buy now') : undefined}
                    data-cr-select-section={!published ? section.id : undefined}
                    style={{ borderColor: document.theme.accentColor }}
                    tabIndex={-1}
                    type="button"
                  >
                    {itemLink?.label ?? 'Buy now'}
                  </button>
                )
              ) : payment?.url || itemLink ? (
                published ? (
                  <a
                    className="mt-5 inline-flex min-h-10 items-center border px-4 py-2 font-semibold text-sm"
                    href={
                      payment?.url ??
                      resolvePublishedSiteHref(document, itemLink?.href ?? '', publicBasePath)
                    }
                    rel="noreferrer"
                    style={{ borderColor: document.theme.accentColor }}
                  >
                    {itemLink?.label ?? 'Buy now'}
                  </a>
                ) : (
                  <button
                    className="mt-5 inline-flex min-h-10 items-center border px-4 py-2 font-semibold text-sm"
                    data-cr-select-item={item.id}
                    data-cr-select-key={`button-${section.id}-${item.id}`}
                    data-cr-select-kind="button"
                    data-cr-select-label={itemLink?.label ?? 'Buy now'}
                    data-cr-select-section={section.id}
                    style={{ borderColor: document.theme.accentColor }}
                    tabIndex={-1}
                    type="button"
                  >
                    {itemLink?.label ?? 'Buy now'}
                  </button>
                )
              ) : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}

/** Match a product card with the active Stripe placement and checkout mode. */
function resolveItemPayment(
  connections: BuilderConnectionSummary[],
  pagePath: string,
  sectionId: string,
  item: NonNullable<SiteSection['items']>[number]
): { mode: 'account' | 'link'; url?: string } | undefined {
  const stripe = connections.find(
    connection => connection.provider === 'stripe' && connection.status === 'connected'
  )
  if (!(stripe && item.price)) return undefined
  if (stripe.placement?.pagePath && stripe.placement.pagePath !== pagePath) return undefined
  if (stripe.placement?.sectionId && stripe.placement.sectionId !== sectionId) return undefined
  if (stripe.placement?.itemId && stripe.placement.itemId !== item.id) return undefined
  if (stripe.mode === 'account' && stripe.accountId) {
    const price = readBuilderPrice(item.price, stripe.defaultCurrency)
    return price ? { mode: 'account' } : undefined
  }
  return stripe.publicUrl ? { mode: 'link', url: stripe.publicUrl } : undefined
}
