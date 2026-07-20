import type { SiteDocument } from '@coderocket/core'

/** Render a versioned site document through audited components rather than arbitrary source code. */
export function SiteDocumentPreview({
  document,
  published = false,
  publicBasePath
}: {
  document: SiteDocument
  published?: boolean
  publicBasePath?: string
}) {
  return (
    <div
      className={published ? 'min-h-screen' : 'min-h-[36rem] overflow-hidden'}
      style={{
        backgroundColor: document.theme.backgroundColor,
        color: document.theme.foregroundColor
      }}
    >
      <header className="flex min-h-16 items-center justify-between gap-6 border-black/10 border-b px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {document.identity.logoUrl ? (
            <img
              alt=""
              className="h-8 w-8 object-contain"
              height={32}
              referrerPolicy="no-referrer"
              src={document.identity.logoUrl}
              width={32}
            />
          ) : null}
          <span className="truncate font-semibold">{document.identity.name}</span>
        </div>
        <nav aria-label="Website navigation" className="hidden items-center gap-5 text-sm sm:flex">
          {document.navigation.slice(0, 5).map(link =>
            published ? (
              <a
                className="hover:underline"
                href={resolvePublishedHref(document, link.href, publicBasePath)}
                key={`${link.href}-${link.label}`}
              >
                {link.label}
              </a>
            ) : (
              <span className="cursor-default" key={`${link.href}-${link.label}`}>
                {link.label}
              </span>
            )
          )}
        </nav>
      </header>
      <main>
        {document.sections.map((section, index) => {
          const content = (
            <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-24">
              <div
                className={
                  section.layout === 'centered'
                    ? 'mx-auto max-w-3xl text-center'
                    : section.layout === 'split' && section.imageUrl
                      ? 'grid items-center gap-10 md:grid-cols-2'
                      : 'max-w-4xl'
                }
              >
                <div>
                  <h2
                    className={
                      index === 0
                        ? 'max-w-4xl font-editorial text-5xl leading-[.92] tracking-[-.035em] sm:text-7xl'
                        : 'max-w-3xl font-editorial text-4xl leading-[.96] tracking-[-.025em] sm:text-5xl'
                    }
                  >
                    {section.heading}
                  </h2>
                  {section.body ? (
                    <p className="mt-6 max-w-2xl whitespace-pre-line text-base leading-7 sm:text-lg">
                      {section.body}
                    </p>
                  ) : null}
                  {section.links.length > 0 ? (
                    <div className="mt-8 flex flex-wrap gap-3">
                      {section.links.map((link, linkIndex) =>
                        published ? (
                          <a
                            className="inline-flex min-h-11 items-center border px-5 py-3 font-semibold text-sm"
                            href={resolvePublishedHref(document, link.href, publicBasePath)}
                            key={`${link.href}-${link.label}`}
                            rel="noreferrer"
                            style={
                              linkIndex === 0
                                ? {
                                    backgroundColor: document.theme.accentColor,
                                    borderColor: document.theme.accentColor,
                                    color: '#ffffff'
                                  }
                                : undefined
                            }
                          >
                            {link.label}
                          </a>
                        ) : (
                          <span
                            className="inline-flex min-h-11 items-center border px-5 py-3 font-semibold text-sm"
                            key={`${link.href}-${link.label}`}
                            style={
                              linkIndex === 0
                                ? {
                                    backgroundColor: document.theme.accentColor,
                                    borderColor: document.theme.accentColor,
                                    color: '#ffffff'
                                  }
                                : undefined
                            }
                          >
                            {link.label}
                          </span>
                        )
                      )}
                    </div>
                  ) : null}
                </div>
                {section.imageUrl ? (
                  <img
                    alt={section.imageAlt ?? ''}
                    className="aspect-[4/3] h-full w-full object-cover"
                    loading={index === 0 ? 'eager' : 'lazy'}
                    referrerPolicy="no-referrer"
                    src={section.imageUrl}
                  />
                ) : null}
              </div>
            </div>
          )
          return (
            <section
              key={section.id}
              style={{
                backgroundColor: section.backgroundColor,
                color: section.foregroundColor
              }}
            >
              {content}
            </section>
          )
        })}
      </main>
      <footer className="border-black/10 border-t px-6 py-8 text-center text-sm">
        <p>{document.identity.name}</p>
      </footer>
    </div>
  )
}

/** Rewrite captured same-origin links to a page included in the published CodeRocket website. */
function resolvePublishedHref(
  document: SiteDocument,
  href: string,
  publicBasePath?: string
): string {
  if (!publicBasePath) return href
  try {
    const target = new URL(href)
    const source = new URL(document.source.url)
    const capturedPaths = new Set(document.pages?.map(page => page.path) ?? ['/'])
    const normalizedPath = target.pathname === '/' ? '/' : target.pathname.replace(/\/+$/, '')
    if (target.origin !== source.origin || !capturedPaths.has(normalizedPath)) return href
    const pathname = normalizedPath === '/' ? '' : normalizedPath
    return `${publicBasePath}${pathname}${target.search}${target.hash}`
  } catch {
    return href
  }
}
