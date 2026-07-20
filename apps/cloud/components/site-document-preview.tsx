import type { SiteDocument } from '@coderocket/core'
import { resolvePublishedSiteHref } from './site-document-href'
import { SiteDocumentSection } from './site-document-section'

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
  const visualTheme = document.theme.visual
  return (
    <div
      className={published ? '@container min-h-screen' : '@container min-h-[36rem] overflow-hidden'}
      style={{
        backgroundColor: document.theme.backgroundColor,
        color: document.theme.foregroundColor,
        fontFamily: visualTheme?.fontFamily
      }}
    >
      <header
        className={`flex items-center justify-between gap-6 border-b @[640px]:px-8 px-5 ${
          visualTheme?.header.position === 'sticky' ? 'sticky top-0 z-30' : ''
        }`}
        style={{
          minHeight: visualTheme?.header.height ?? 64,
          backgroundColor: visualTheme?.header.backgroundColor,
          borderColor: visualTheme?.header.borderColor,
          color: visualTheme?.header.foregroundColor
        }}
      >
        <div
          className="flex min-w-0 items-center gap-3"
          data-cr-select-key={!published ? 'brand' : undefined}
          data-cr-select-kind={!published ? 'brand' : undefined}
          data-cr-select-label={!published ? document.identity.name : undefined}
        >
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
        <nav
          aria-label="Website navigation"
          className="@[640px]:flex hidden items-center gap-5 text-sm"
        >
          {document.navigation.slice(0, 5).map(link =>
            published ? (
              <a
                className="hover:underline"
                href={resolvePublishedSiteHref(document, link.href, publicBasePath)}
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
        {document.navigation.length > 0 ? (
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
      <main>
        {document.sections.map((section, index) => (
          <SiteDocumentSection
            document={document}
            index={index}
            key={section.id}
            publicBasePath={publicBasePath}
            published={published}
            section={section}
          />
        ))}
      </main>
      <footer className="border-black/10 border-t px-6 py-8 text-center text-sm">
        <p>{document.identity.name}</p>
      </footer>
    </div>
  )
}
