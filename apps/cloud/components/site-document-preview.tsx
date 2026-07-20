import type { SiteDocument } from '@coderocket/core'
import type { BuilderConnectionSummary } from '@/lib/builder-connections'
import { resolvePublishedSiteHref } from './site-document-href'
import { SiteDocumentSection } from './site-document-section'

/** Render a versioned site document through controlled components rather than arbitrary source code. */
export function SiteDocumentPreview({
  checkoutPath,
  connections = [],
  document,
  pagePath = '/',
  published = false,
  publicBasePath
}: {
  checkoutPath?: string
  connections?: BuilderConnectionSummary[]
  document: SiteDocument
  pagePath?: string
  published?: boolean
  publicBasePath?: string
}) {
  const visualTheme = document.theme.visual
  const showBrand = document.identity.showInHeader !== false
  const showHeader = showBrand || document.navigation.length > 0
  const compactNavigation = document.navigation.length <= 3
  return (
    <div
      className={
        published
          ? '@container flex min-h-screen flex-col'
          : '@container flex min-h-[36rem] flex-col overflow-hidden'
      }
      style={{
        backgroundColor: document.theme.backgroundColor,
        color: document.theme.foregroundColor,
        fontFamily: visualTheme?.fontFamily
      }}
    >
      {showHeader ? (
        <header
          className={`flex items-center gap-5 border-b @[640px]:px-8 px-5 ${
            showBrand ? 'justify-between' : 'justify-end'
          } ${visualTheme?.header.position === 'sticky' ? 'sticky top-0 z-30' : ''}`}
          style={{
            minHeight: visualTheme?.header.height ?? 64,
            backgroundColor: visualTheme?.header.backgroundColor,
            borderColor: visualTheme?.header.borderColor,
            color: visualTheme?.header.foregroundColor
          }}
        >
          {showBrand ? (
            <div
              className="flex min-w-0 items-center gap-3"
              data-cr-select-key={!published ? 'brand' : undefined}
              data-cr-select-kind={!published ? 'brand' : undefined}
              data-cr-select-label={!published ? document.identity.name : undefined}
            >
              {document.identity.logoUrl ? (
                <img
                  alt=""
                  className="h-8 w-auto max-w-40 object-contain"
                  height={32}
                  referrerPolicy="no-referrer"
                  src={document.identity.logoUrl}
                  width={160}
                />
              ) : null}
              <span className="truncate font-semibold">{document.identity.name}</span>
            </div>
          ) : null}
          <nav
            aria-label="Website navigation"
            className={`${compactNavigation ? 'flex' : '@[640px]:flex hidden'} items-center gap-4 text-sm`}
          >
            {document.navigation.slice(0, 5).map(link =>
              published ? (
                <a
                  className={navigationLinkClass(link.prominent)}
                  href={resolvePublishedSiteHref(document, link.href, publicBasePath)}
                  key={`${link.href}-${link.label}`}
                  style={navigationLinkStyle(document, link.prominent)}
                >
                  {link.label}
                </a>
              ) : (
                <span
                  className={navigationLinkClass(link.prominent)}
                  key={`${link.href}-${link.label}`}
                  style={navigationLinkStyle(document, link.prominent)}
                >
                  {link.label}
                </span>
              )
            )}
          </nav>
          {!compactNavigation && document.navigation.length > 0 ? (
            <details className="relative @[640px]:hidden">
              <summary className="cursor-pointer list-none border px-3 py-2 font-semibold text-sm">
                Menu
              </summary>
              <nav
                aria-label="Mobile website navigation"
                className="absolute top-[calc(100%+0.5rem)] right-0 z-40 grid min-w-52 gap-1 border bg-inherit p-2 shadow-lg"
              >
                {document.navigation.slice(0, 8).map(link =>
                  published ? (
                    <a
                      className="px-3 py-2 text-sm hover:underline"
                      href={resolvePublishedSiteHref(document, link.href, publicBasePath)}
                      key={`${link.href}-${link.label}-mobile`}
                    >
                      {link.label}
                    </a>
                  ) : (
                    <span
                      className="cursor-default px-3 py-2 text-sm"
                      key={`${link.href}-${link.label}-mobile`}
                    >
                      {link.label}
                    </span>
                  )
                )}
              </nav>
            </details>
          ) : null}
        </header>
      ) : null}
      <main className="flex flex-1 flex-col [&>section:only-child]:flex-1">
        {document.sections.map((section, index) => (
          <SiteDocumentSection
            checkoutPath={checkoutPath}
            connections={connections}
            document={document}
            index={index}
            key={section.id}
            pagePath={pagePath}
            publicBasePath={publicBasePath}
            published={published}
            section={section}
          />
        ))}
      </main>
      <footer className="border-black/10 border-t px-6 py-8 text-center text-sm">
        {document.footer ? (
          <div className="grid justify-items-center gap-3">
            {document.footer.links.length > 0 ? (
              <nav aria-label="Footer navigation" className="flex flex-wrap justify-center gap-5">
                {document.footer.links.map(link =>
                  published ? (
                    <a
                      href={resolvePublishedSiteHref(document, link.href, publicBasePath)}
                      key={`${link.href}-${link.label}`}
                    >
                      {link.label}
                    </a>
                  ) : (
                    <span key={`${link.href}-${link.label}`}>{link.label}</span>
                  )
                )}
              </nav>
            ) : null}
            {document.footer.text ? <p>{document.footer.text}</p> : null}
          </div>
        ) : (
          <p>{document.identity.name}</p>
        )}
      </footer>
    </div>
  )
}

/** Keep a captured header call-to-action distinct from ordinary navigation links. */
function navigationLinkClass(prominent?: boolean): string {
  return prominent
    ? 'inline-flex min-h-10 items-center border px-5 font-medium'
    : 'cursor-default hover:underline'
}

/** Apply the measured primary-button treatment only to a prominent navigation link. */
function navigationLinkStyle(document: SiteDocument, prominent?: boolean) {
  if (!prominent) return undefined
  const button = document.theme.visual?.button
  return {
    backgroundColor:
      button?.style === 'outline'
        ? 'transparent'
        : (button?.backgroundColor ?? document.theme.accentColor),
    borderColor: button?.borderColor ?? document.theme.accentColor,
    borderRadius: button?.radius,
    color: button?.foregroundColor ?? '#ffffff'
  }
}
