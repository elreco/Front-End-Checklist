import type { Page } from 'playwright-core'
import type { SiteSourceBlueprint, SourceSectionBlueprint } from './site-document'
import type { ResponsiveSectionStyle } from './site-visual-style'

export { mergeResponsiveBlueprints } from './site-blueprint-responsive'
export {
  SITE_CAPTURE_VIEWPORTS,
  type SiteCaptureStudy,
  type SiteViewportCapture,
  type SiteViewportDefinition,
  type SiteViewportName
} from './site-blueprint-types'

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
      const closedDetails = element.closest<HTMLDetailsElement>('details:not([open])')
      if (closedDetails && !closedDetails.querySelector('summary')?.contains(element)) return false
      const style = window.getComputedStyle(element)
      const bounds = element.getBoundingClientRect()
      if (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity || 1) > 0 &&
        bounds.height > 24 &&
        bounds.width > 24
      ) {
        let left = bounds.left
        let right = bounds.right
        let top = bounds.top
        let bottom = bounds.bottom
        let ancestor = element.parentElement
        while (ancestor) {
          const ancestorStyle = window.getComputedStyle(ancestor)
          if (
            ancestorStyle.display === 'none' ||
            ancestorStyle.visibility === 'hidden' ||
            Number(ancestorStyle.opacity || 1) === 0
          )
            return false
          if (
            /hidden|clip|scroll/.test(
              `${ancestorStyle.overflow} ${ancestorStyle.overflowX} ${ancestorStyle.overflowY}`
            )
          ) {
            const ancestorBounds = ancestor.getBoundingClientRect()
            left = Math.max(left, ancestorBounds.left)
            right = Math.min(right, ancestorBounds.right)
            top = Math.max(top, ancestorBounds.top)
            bottom = Math.min(bottom, ancestorBounds.bottom)
            if (right - left <= 1 || bottom - top <= 1) return false
          }
          ancestor = ancestor.parentElement
        }
        return true
      }
      return false
    }
    /** Resolve transparent wrappers against their rendered ancestor surface. */
    const effectiveBackground = (element: HTMLElement) => {
      let current: HTMLElement | null = element
      while (current) {
        const color = window.getComputedStyle(current).backgroundColor
        if (
          color &&
          color !== 'transparent' &&
          color !== 'rgba(0, 0, 0, 0)' &&
          color !== 'rgba(0,0,0,0)'
        )
          return color
        current = current.parentElement
      }
      return 'rgb(255, 255, 255)'
    }
    /** Keep only secure visible links with a label an owner can recognise. */
    const linksFrom = (element: HTMLElement) => {
      const seen = new Set<string>()
      return Array.from(element.querySelectorAll<HTMLElement>('a[href], details > summary'))
        .filter(link => visible(link))
        .flatMap(link => {
          const label = compact(link.textContent, 80)
          try {
            const destination =
              link instanceof HTMLAnchorElement
                ? link.href
                : link.parentElement?.querySelector<HTMLAnchorElement>('a[href]')?.href
            if (!destination) return []
            const href = new URL(destination, window.location.href)
            const fingerprint = `${href.toString()}|${label}`
            if (!label || href.protocol !== 'https:' || seen.has(fingerprint)) return []
            seen.add(fingerprint)
            return [{ href: href.toString(), label }]
          } catch {
            return []
          }
        })
        .slice(0, 8)
    }
    /** Resolve common native and lazy-loaded image attributes to one public HTTPS asset. */
    const imageUrlFrom = (image: HTMLImageElement | null) => {
      if (!image) return undefined
      const candidates = [
        image.currentSrc,
        image.src,
        image.getAttribute('data-src'),
        image.getAttribute('data-lazy-src'),
        image.getAttribute('data-original')
      ]
      for (const candidate of candidates) {
        if (!candidate) continue
        try {
          const url = new URL(candidate, window.location.href)
          if (url.protocol === 'https:') return url.toString()
        } catch {}
      }
      return undefined
    }
    /** Prefer the largest rendered image instead of a hidden lazy placeholder or feature icon. */
    const largestImageFrom = (container: HTMLElement) =>
      Array.from(container.querySelectorAll<HTMLImageElement>('img'))
        .filter(image => visible(image) && Boolean(imageUrlFrom(image)))
        .sort((left, right) => {
          const leftBounds = left.getBoundingClientRect()
          const rightBounds = right.getBoundingClientRect()
          return rightBounds.width * rightBounds.height - leftBounds.width * leftBounds.height
        })[0] ?? null
    /** Measure the union of visible semantic content rather than the full-width outer wrapper. */
    const contentBoundsFrom = (container: HTMLElement) => {
      const elements = Array.from(
        container.querySelectorAll<HTMLElement>(
          'h1, h2, h3, p, img, button, [role="button"], a[href]'
        )
      ).filter(element => visible(element))
      const bounds = elements.map(element => element.getBoundingClientRect())
      if (bounds.length === 0) return container.getBoundingClientRect()
      const left = Math.min(...bounds.map(bound => bound.left))
      const right = Math.max(...bounds.map(bound => bound.right))
      const top = Math.min(...bounds.map(bound => bound.top))
      const bottom = Math.max(...bounds.map(bound => bound.bottom))
      return {
        bottom,
        height: bottom - top,
        left,
        right,
        top,
        width: right - left
      }
    }
    /** Measure the visible text column so split-layout gaps survive generic rendering. */
    const textBoundsFrom = (container: HTMLElement) => {
      const bounds = Array.from(
        container.querySelectorAll<HTMLElement>('h1, h2, h3, p, button, [role="button"], a[href]')
      )
        .filter(element => visible(element))
        .map(element => element.getBoundingClientRect())
      if (bounds.length === 0) return undefined
      return {
        bottom: Math.max(...bounds.map(bound => bound.bottom)),
        left: Math.min(...bounds.map(bound => bound.left)),
        right: Math.max(...bounds.map(bound => bound.right)),
        top: Math.min(...bounds.map(bound => bound.top))
      }
    }
    /** Capture repeated visible cards as structured content rather than separate website pages. */
    const itemsFrom = (container: HTMLElement): NonNullable<SourceSectionBlueprint['items']> => {
      const candidates = Array.from(
        container.querySelectorAll<HTMLElement>(
          'article, li, [class*="card" i], [class*="product" i], [data-testid*="product" i]'
        )
      )
        .filter(candidate => visible(candidate))
        .filter(candidate => {
          const parentCandidate = candidate.parentElement?.closest(
            'article, li, [class*="card" i], [class*="product" i], [data-testid*="product" i]'
          )
          return !parentCandidate || !container.contains(parentCandidate)
        })
        .slice(0, 12)
      if (candidates.length < 2) return []
      return candidates.flatMap(candidate => {
        const titleElement = candidate.querySelector<HTMLElement>(
          'h2, h3, h4, [class*="title" i], [class*="name" i]'
        )
        const title = compact(titleElement?.textContent, 180)
        const body = compact(candidate.querySelector<HTMLElement>('p')?.textContent, 500)
        const image = largestImageFrom(candidate)
        const text = compact(candidate.textContent, 500)
        const price =
          text.match(/(?:€|\$|£)\s?\d[\d\s,.]*|\d[\d\s,.]*\s?(?:€|\$|£)/)?.[0]?.trim() ?? undefined
        if (!title && !imageUrlFrom(image)) return []
        return [
          {
            title: title || compact(image?.alt, 180) || 'Item',
            body,
            imageAlt: compact(image?.alt, 240),
            imageUrl: imageUrlFrom(image),
            links: linksFrom(candidate).slice(0, 2),
            price
          }
        ]
      })
    }
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
      contentBounds: ReturnType<typeof contentBoundsFrom>,
      containerStyle: CSSStyleDeclaration,
      headingStyle: CSSStyleDeclaration,
      bodyStyle: CSSStyleDeclaration,
      measuredGap?: number
    ): ResponsiveSectionStyle => ({
      contentWidth: measure(
        Math.min(window.innerWidth, contentBounds.width + (window.innerWidth >= 640 ? 80 : 48)),
        320,
        1440,
        Math.min(window.innerWidth, 1152)
      ),
      paddingBlock: measure(
        Math.max(
          Number.parseFloat(containerStyle.paddingTop),
          Number.parseFloat(containerStyle.paddingBottom),
          Math.min(contentBounds.top - bounds.top, bounds.bottom - contentBounds.bottom)
        ),
        16,
        240,
        64
      ),
      headingSize: measure(headingStyle.fontSize, 20, 120, window.innerWidth < 700 ? 40 : 64),
      bodySize: measure(bodyStyle.fontSize, 12, 32, 18),
      gap: measure(
        measuredGap ??
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
    const logo = header ? largestImageFrom(header) : null
    const brandText =
      compact(
        header?.querySelector<HTMLElement>(
          '[aria-label*="home" i], [class*="logo" i], [class*="brand" i]'
        )?.textContent,
        120
      ) || compact(document.title.split(/[|—–-]/)[0], 120)
    const navigation = header
      ? linksFrom(header).filter(
          link => link.label.toLocaleLowerCase() !== brandText.toLocaleLowerCase()
        )
      : []
    const candidateFingerprints = new Set<string>()
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>(
        'main > section, main > article, main > div, body > section'
      )
    )
      .filter(visible)
      .filter(candidate => {
        const heading = compact(
          candidate.querySelector<HTMLElement>('h1, h2, h3')?.textContent,
          180
        )
        const body = compact(
          Array.from(candidate.querySelectorAll<HTMLElement>('p, li'))
            .filter(element => visible(element))
            .map(element => element.textContent)
            .join(' '),
          500
        )
        const image = largestImageFrom(candidate)
        const imageBounds = image?.getBoundingClientRect()
        const imageUrl = imageUrlFrom(image)
        const labelledAction = linksFrom(candidate).length > 0
        const meaningful =
          Boolean(heading) ||
          body.length >= 20 ||
          labelledAction ||
          Boolean(imageBounds && imageUrl && imageBounds.width * imageBounds.height >= 12_000)
        if (!meaningful) return false
        const fingerprint = `${heading}|${body}|${imageUrl ?? ''}`
        if (candidateFingerprints.has(fingerprint)) return false
        candidateFingerprints.add(fingerprint)
        return true
      })
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
        const contentBounds = contentBoundsFrom(container)
        const heading = container.querySelector<HTMLElement>('h1, h2, h3')
        const headingStyle = heading ? window.getComputedStyle(heading) : style
        const body = container.querySelector<HTMLElement>('p, li')
        const sectionBodyStyle = body ? window.getComputedStyle(body) : style
        const image = largestImageFrom(container)
        const imageStyle = image ? window.getComputedStyle(image) : style
        const imageBounds = image?.getBoundingClientRect()
        const textBounds = textBoundsFrom(container)
        const measuredGap =
          imageBounds && textBounds
            ? textBounds.right <= imageBounds.left
              ? imageBounds.left - textBounds.right
              : imageBounds.right <= textBounds.left
                ? textBounds.left - imageBounds.right
                : undefined
            : undefined
        const paragraphs = Array.from(container.querySelectorAll<HTMLElement>('p, li'))
          .filter(visible)
          .map(element => compact(element.textContent, 240))
          .filter(Boolean)
          .slice(0, 8)
        const currentResponsiveStyle = responsiveStyle(
          bounds,
          contentBounds,
          style,
          headingStyle,
          sectionBodyStyle,
          measuredGap
        )
        const hasBackgroundImage = style.backgroundImage && style.backgroundImage !== 'none'
        const imageBeforeHeading =
          image && heading
            ? Boolean(image.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING)
            : false
        return {
          backgroundColor: effectiveBackground(container),
          body: compact(paragraphs.join(' ')),
          foregroundColor: style.color,
          heading: compact(heading?.textContent, 180),
          imageAlt: compact(image?.alt, 240),
          imageUrl: imageUrlFrom(image),
          items: itemsFrom(container),
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
            imageFit: imageStyle.objectFit === 'cover' ? 'cover' : 'contain',
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
      backgroundColor: effectiveBackground(document.body),
      brandName: brandText || window.location.hostname.replace(/^www\./, ''),
      capturedAt: new Date().toISOString(),
      description: compact(description?.content),
      foregroundColor: bodyStyle.color,
      logoUrl: logo?.currentSrc || logo?.src || undefined,
      navigation,
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
          backgroundColor: header
            ? effectiveBackground(header)
            : effectiveBackground(document.body),
          foregroundColor: headerStyle.color || bodyStyle.color,
          borderColor:
            measure(headerStyle.borderBottomWidth, 0, 4, 0) > 0
              ? headerStyle.borderBottomColor
              : 'rgba(0, 0, 0, 0.12)',
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
