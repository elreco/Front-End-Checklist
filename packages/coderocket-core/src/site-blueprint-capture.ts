import type { Page } from 'playwright-core'
import type { SiteSourceBlueprint, SourceSectionBlueprint } from './site-document'
import type { ResponsiveSectionStyle } from './site-visual-style'

export type SiteViewportName = 'desktop' | 'tablet' | 'mobile'

export interface SiteViewportDefinition {
  height: number
  name: SiteViewportName
  width: number
}

export interface SiteViewportCapture extends SiteViewportDefinition {
  dataUrl: string
}

export interface SiteCaptureStudy {
  blueprint: SiteSourceBlueprint
  captures: SiteViewportCapture[]
}

export const SITE_CAPTURE_VIEWPORTS: SiteViewportDefinition[] = [
  { name: 'desktop', width: 1440, height: 1600 },
  { name: 'tablet', width: 768, height: 1400 },
  { name: 'mobile', width: 390, height: 1200 }
]

/** Read content, geometry, type, spacing, surfaces, and controls from one rendered viewport. */
export async function capturePageBlueprint(page: Page): Promise<SiteSourceBlueprint> {
  return page.evaluate((): SiteSourceBlueprint => {
    /** Keep untrusted page copy bounded before it leaves the isolated browser. */
    const compact = (value?: string | null, maximumLength = 1200) =>
      (value ?? '').replace(/\s+/g, ' ').trim().slice(0, maximumLength)
    /** Bound measurements so unusual pages cannot create pathological generated CSS. */
    const measure = (
      value: string | number,
      minimum: number,
      maximum: number,
      fallback: number
    ) => {
      const numeric = typeof value === 'number' ? value : Number.parseFloat(value)
      return Number.isFinite(numeric)
        ? Math.round(Math.max(minimum, Math.min(maximum, numeric)))
        : fallback
    }
    /** Bound unitless measurements while retaining useful typographic precision. */
    const ratio = (value: string | number, minimum: number, maximum: number, fallback: number) => {
      const numeric = typeof value === 'number' ? value : Number.parseFloat(value)
      return Number.isFinite(numeric)
        ? Math.round(Math.max(minimum, Math.min(maximum, numeric)) * 100) / 100
        : fallback
    }
    /** Ignore empty, hidden, and off-canvas layout containers. */
    const visible = (element: HTMLElement) => {
      const style = window.getComputedStyle(element)
      const bounds = element.getBoundingClientRect()
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity || 1) > 0 &&
        bounds.height > 24 &&
        bounds.width > 24
      )
    }
    /** Keep only secure visible links with a label an owner can recognise. */
    const linksFrom = (element: HTMLElement) =>
      Array.from(element.querySelectorAll<HTMLAnchorElement>('a[href]'))
        .filter(link => visible(link))
        .flatMap(link => {
          const label = compact(link.textContent, 80)
          try {
            const href = new URL(link.href, window.location.href)
            return label && href.protocol === 'https:' ? [{ href: href.toString(), label }] : []
          } catch {
            return []
          }
        })
        .slice(0, 8)
    /** Classify visible shadow depth without storing arbitrary CSS. */
    const elevation = (shadow: string): 'none' | 'soft' | 'strong' => {
      if (!shadow || shadow === 'none') return 'none'
      const numbers =
        shadow.match(/-?\d+(?:\.\d+)?px/g)?.map(value => Number.parseFloat(value)) ?? []
      return Math.max(...numbers.map(Math.abs), 0) >= 24 ? 'strong' : 'soft'
    }
    /** Infer whether source content is side-by-side, centered, or vertically stacked. */
    const layoutFrom = (
      container: HTMLElement,
      heading: HTMLElement | null,
      image: HTMLImageElement | null
    ): 'centered' | 'split' | 'stacked' => {
      const style = window.getComputedStyle(container)
      if (heading && image && window.innerWidth >= 700) {
        const headingBounds = heading.getBoundingClientRect()
        const imageBounds = image.getBoundingClientRect()
        const verticalOverlap =
          Math.min(headingBounds.bottom, imageBounds.bottom) -
          Math.max(headingBounds.top, imageBounds.top)
        if (verticalOverlap > Math.min(headingBounds.height, imageBounds.height) * 0.35)
          return 'split'
      }
      return style.textAlign === 'center' ? 'centered' : 'stacked'
    }
    /** Return the stable responsive values consumed by the controlled renderer. */
    const responsiveStyle = (
      bounds: DOMRect,
      containerStyle: CSSStyleDeclaration,
      headingStyle: CSSStyleDeclaration,
      bodyStyle: CSSStyleDeclaration
    ): ResponsiveSectionStyle => ({
      contentWidth: measure(bounds.width, 320, 1440, Math.min(window.innerWidth, 1152)),
      paddingBlock: measure(
        Math.max(
          Number.parseFloat(containerStyle.paddingTop),
          Number.parseFloat(containerStyle.paddingBottom)
        ),
        16,
        240,
        64
      ),
      headingSize: measure(headingStyle.fontSize, 20, 120, window.innerWidth < 700 ? 40 : 64),
      bodySize: measure(bodyStyle.fontSize, 12, 32, 18),
      gap: measure(
        Math.max(
          Number.parseFloat(containerStyle.rowGap),
          Number.parseFloat(containerStyle.columnGap)
        ),
        8,
        120,
        32
      ),
      textAlign:
        containerStyle.textAlign === 'center'
          ? 'center'
          : containerStyle.textAlign === 'right'
            ? 'right'
            : 'left'
    })

    const bodyStyle = window.getComputedStyle(document.body)
    const header = document.querySelector<HTMLElement>('header')
    const headerStyle = header ? window.getComputedStyle(header) : bodyStyle
    const logo = header?.querySelector<HTMLImageElement>('img[src]')
    const brandText =
      compact(
        header?.querySelector<HTMLElement>(
          '[aria-label*="home" i], [class*="logo" i], [class*="brand" i]'
        )?.textContent,
        120
      ) || compact(document.title.split(/[|—–-]/)[0], 120)
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>(
        'main > section, main > article, main > div, body > section'
      )
    ).filter(visible)
    const containers =
      candidates.length > 0
        ? candidates.slice(0, 12)
        : [document.querySelector<HTMLElement>('main') ?? document.body]
    const action = document.querySelector<HTMLElement>(
      'a[class*="button" i], a[class*="cta" i], button, [role="button"]'
    )
    const actionStyle = action ? window.getComputedStyle(action) : bodyStyle
    const sections: SourceSectionBlueprint[] = containers.map(
      (container): SourceSectionBlueprint => {
        const style = window.getComputedStyle(container)
        const bounds = container.getBoundingClientRect()
        const heading = container.querySelector<HTMLElement>('h1, h2, h3')
        const headingStyle = heading ? window.getComputedStyle(heading) : style
        const body = container.querySelector<HTMLElement>('p, li')
        const sectionBodyStyle = body ? window.getComputedStyle(body) : style
        const image = container.querySelector<HTMLImageElement>('img[src]')
        const imageStyle = image ? window.getComputedStyle(image) : style
        const imageBounds = image?.getBoundingClientRect()
        const paragraphs = Array.from(container.querySelectorAll<HTMLElement>('p, li'))
          .filter(visible)
          .map(element => compact(element.textContent, 240))
          .filter(Boolean)
          .slice(0, 8)
        const currentResponsiveStyle = responsiveStyle(
          bounds,
          style,
          headingStyle,
          sectionBodyStyle
        )
        const hasBackgroundImage = style.backgroundImage && style.backgroundImage !== 'none'
        const imageBeforeHeading =
          image && heading
            ? Boolean(image.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING)
            : false
        return {
          backgroundColor: style.backgroundColor,
          body: compact(paragraphs.join(' ')),
          foregroundColor: style.color,
          heading: compact(heading?.textContent, 180),
          imageAlt: compact(image?.alt, 240),
          imageUrl: image?.currentSrc || image?.src || undefined,
          layout: layoutFrom(container, heading, image),
          links: linksFrom(container).slice(0, 4),
          visual: {
            desktop: currentResponsiveStyle,
            mobile: currentResponsiveStyle,
            headingFontFamily: compact(headingStyle.fontFamily, 160) || 'system-ui, sans-serif',
            headingFontWeight: measure(headingStyle.fontWeight, 100, 900, 700),
            headingLineHeight: ratio(
              Number.parseFloat(headingStyle.lineHeight) / Number.parseFloat(headingStyle.fontSize),
              0.75,
              2,
              1
            ),
            headingLetterSpacing: ratio(headingStyle.letterSpacing, -8, 12, 0),
            bodyLineHeight: ratio(
              Number.parseFloat(sectionBodyStyle.lineHeight) /
                Number.parseFloat(sectionBodyStyle.fontSize),
              1,
              2.5,
              1.5
            ),
            borderRadius: measure(style.borderRadius, 0, 80, 0),
            borderWidth: measure(style.borderTopWidth, 0, 4, 0),
            borderColor: style.borderColor || 'rgba(0, 0, 0, 0)',
            elevation: elevation(style.boxShadow),
            imageAspectRatio: imageBounds
              ? ratio(imageBounds.width / imageBounds.height, 0.4, 3, 1.33)
              : 1.33,
            imageFit: imageStyle.objectFit === 'contain' ? 'contain' : 'cover',
            imagePosition: hasBackgroundImage
              ? 'background'
              : imageBeforeHeading
                ? 'before'
                : 'after',
            backgroundImage: compact(style.backgroundImage, 500)
          }
        }
      }
    )
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"], meta[property="og:description"]'
    )
    const transparentButton =
      actionStyle.backgroundColor === 'rgba(0, 0, 0, 0)' ||
      actionStyle.backgroundColor === 'transparent'
    const buttonHasBorder = measure(actionStyle.borderTopWidth, 0, 4, 0) > 0
    return {
      accentColor: transparentButton ? actionStyle.color : actionStyle.backgroundColor,
      backgroundColor: bodyStyle.backgroundColor,
      brandName: brandText || window.location.hostname.replace(/^www\./, ''),
      capturedAt: new Date().toISOString(),
      description: compact(description?.content),
      foregroundColor: bodyStyle.color,
      logoUrl: logo?.currentSrc || logo?.src || undefined,
      navigation: header ? linksFrom(header) : [],
      sections,
      sourceUrl: window.location.href,
      title: compact(document.querySelector('h1')?.textContent, 180) || document.title,
      visualAnalysis: 'responsive-dom',
      visualTheme: {
        fontFamily: compact(bodyStyle.fontFamily, 160) || 'system-ui, sans-serif',
        headingFontFamily:
          compact(
            document.querySelector<HTMLElement>('h1, h2, h3')
              ? window.getComputedStyle(
                  document.querySelector<HTMLElement>('h1, h2, h3') ?? document.body
                ).fontFamily
              : bodyStyle.fontFamily,
            160
          ) || 'system-ui, sans-serif',
        header: {
          backgroundColor: headerStyle.backgroundColor || bodyStyle.backgroundColor,
          foregroundColor: headerStyle.color || bodyStyle.color,
          borderColor: headerStyle.borderColor || 'rgba(0, 0, 0, 0.12)',
          height: measure(header?.getBoundingClientRect().height ?? 64, 48, 120, 64),
          position: ['fixed', 'sticky'].includes(headerStyle.position) ? 'sticky' : 'static'
        },
        button: {
          backgroundColor: actionStyle.backgroundColor || bodyStyle.color,
          foregroundColor: actionStyle.color || bodyStyle.backgroundColor,
          borderColor: actionStyle.borderColor || actionStyle.backgroundColor,
          radius: measure(actionStyle.borderRadius, 0, 60, 0),
          style: transparentButton ? (buttonHasBorder ? 'outline' : 'soft') : 'solid'
        }
      }
    }
  })
}

/** Merge three inspected layouts without retaining screenshots or executable source. */
export function mergeResponsiveBlueprints(
  desktop: SiteSourceBlueprint,
  tablet: SiteSourceBlueprint,
  mobile: SiteSourceBlueprint
): SiteSourceBlueprint {
  return {
    ...desktop,
    sections: desktop.sections.map((section, index) => {
      const tabletSection = tablet.sections[index]
      const mobileSection = mobile.sections[index]
      if (!section.visual) return section
      return {
        ...section,
        layout: section.layout ?? tabletSection?.layout ?? mobileSection?.layout,
        visual: {
          ...section.visual,
          desktop: section.visual.desktop,
          mobile:
            mobileSection?.visual?.mobile ?? tabletSection?.visual?.mobile ?? section.visual.mobile
        }
      }
    }),
    visualAnalysis: 'responsive-dom',
    visualTheme: desktop.visualTheme
  }
}
