import type { Page } from 'playwright-core'
import type {
  SiteSourceBlueprint,
  SourceFormBlueprint,
  SourceFormControl,
  SourceLink,
  SourceSectionBlueprint
} from './site-document'
import type { SiteVisualTheme } from './site-visual-style'

interface CapturedSectionStructure {
  form?: SourceFormBlueprint
  imageAspectRatio?: number
  imagePosition?: 'after' | 'before'
  imageWidth?: number
  links: SourceLink[]
}

interface CapturedPageStructure {
  button?: SiteVisualTheme['button']
  footerLinks: SourceLink[]
  footerText?: string
  headerBrandVisible: boolean
  navigation: SourceLink[]
  sections: CapturedSectionStructure[]
}

/** Add controls and page chrome that cannot be represented by the visual-only capture pass. */
export async function enrichPageBlueprintStructure(
  page: Page,
  blueprint: SiteSourceBlueprint
): Promise<SiteSourceBlueprint> {
  const structure = await capturePageStructure(page)
  return {
    ...blueprint,
    footerLinks: structure.footerLinks,
    footerText: structure.footerText,
    headerBrandVisible: structure.headerBrandVisible,
    navigation: structure.navigation,
    sections: blueprint.sections.map((section, index) =>
      mergeSectionStructure(section, structure.sections[index])
    ),
    visualTheme:
      structure.button && blueprint.visualTheme
        ? { ...blueprint.visualTheme, button: structure.button }
        : blueprint.visualTheme
  }
}

/** Preserve the original content capture while adding measured controls and media width. */
function mergeSectionStructure(
  section: SourceSectionBlueprint,
  structure?: CapturedSectionStructure
): SourceSectionBlueprint {
  if (!structure) return section
  return {
    ...section,
    form: structure.form,
    imageWidth: structure.imageWidth,
    links: structure.links,
    visual:
      section.visual && structure.imageAspectRatio
        ? {
            ...section.visual,
            imageAspectRatio: structure.imageAspectRatio,
            imagePosition: structure.imagePosition ?? section.visual.imagePosition
          }
        : section.visual
  }
}

/** Inspect bounded native controls, navigation, footer links, and image geometry in the page. */
async function capturePageStructure(page: Page): Promise<CapturedPageStructure> {
  return page.evaluate((): CapturedPageStructure => {
    /** Collapse visible page copy into one bounded line. */
    const compact = (value?: string | null, maximumLength = 240) =>
      (value ?? '').replace(/\s+/g, ' ').trim().slice(0, maximumLength)
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
    /** Ignore elements that cannot contribute to the rendered page. */
    const visible = (element: HTMLElement) => {
      const style = window.getComputedStyle(element)
      const bounds = element.getBoundingClientRect()
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity || 1) > 0 &&
        bounds.width > 8 &&
        bounds.height > 8 &&
        bounds.bottom > 0 &&
        bounds.right > 0
      )
    }
    /** Resolve only secure network URLs against the final page address. */
    const safeUrl = (value?: string | null) => {
      if (!value) return undefined
      try {
        const url = new URL(value, window.location.href)
        return url.protocol === 'https:' ? url.toString() : undefined
      } catch {
        return undefined
      }
    }
    /** Detect links that visually behave like primary actions. */
    const prominent = (element: HTMLElement) => {
      const style = window.getComputedStyle(element)
      const background = style.backgroundColor
      return (
        (background !== 'transparent' && background !== 'rgba(0, 0, 0, 0)') ||
        Number.parseFloat(style.borderTopWidth) > 0
      )
    }
    const linksFrom = (
      container: HTMLElement,
      predicate: (link: HTMLAnchorElement) => boolean = () => true
    ): SourceLink[] => {
      const seen = new Set<string>()
      return Array.from(container.querySelectorAll<HTMLAnchorElement>('a[href]'))
        .filter(link => visible(link) && predicate(link))
        .flatMap(link => {
          const href = safeUrl(link.href)
          const label = compact(link.textContent, 80)
          const fingerprint = `${href ?? ''}|${label}`
          if (!href || !label || seen.has(fingerprint)) return []
          seen.add(fingerprint)
          return [{ href, label, ...(prominent(link) ? { prominent: true } : {}) }]
        })
        .slice(0, 12)
    }
    /** Prefer the image resource the browser actually rendered. */
    const imageUrl = (image: HTMLImageElement) =>
      safeUrl(
        image.currentSrc ||
          image.src ||
          image.getAttribute('data-src') ||
          image.getAttribute('data-lazy-src')
      )
    /** Select the main visible image for one bounded content region. */
    const largestImage = (container: HTMLElement) =>
      Array.from(container.querySelectorAll<HTMLImageElement>('img'))
        .filter(image => visible(image) && Boolean(imageUrl(image)))
        .sort((left, right) => {
          const leftBounds = left.getBoundingClientRect()
          const rightBounds = right.getBoundingClientRect()
          return rightBounds.width * rightBounds.height - leftBounds.width * leftBounds.height
        })[0]
    const readForm = (form: HTMLFormElement): SourceFormBlueprint | undefined => {
      const elements = Array.from(form.querySelectorAll<HTMLElement>('input, button')).filter(
        visible
      )
      const input = elements.find(
        element =>
          element instanceof HTMLInputElement &&
          !['button', 'hidden', 'submit'].includes(element.type)
      )
      if (!(input instanceof HTMLInputElement)) return undefined
      const controls: SourceFormControl[] = []
      for (const element of elements) {
        if (element instanceof HTMLButtonElement) {
          const label = compact(element.textContent || element.getAttribute('aria-label'), 80)
          if (label)
            controls.push({
              kind: 'button',
              label,
              ...(element.name ? { name: element.name } : {})
            })
          continue
        }
        if (!(element instanceof HTMLInputElement)) continue
        if (element.type === 'submit' || element.type === 'button') {
          const label = compact(element.value || element.getAttribute('aria-label'), 80)
          if (label)
            controls.push({
              kind: 'button',
              label,
              ...(element.name ? { name: element.name } : {}),
              ...(element.value ? { value: compact(element.value, 160) } : {})
            })
          continue
        }
        if (element !== input) continue
        const supportedType: SourceFormControl['type'] =
          element.type === 'email' ||
          element.type === 'search' ||
          element.type === 'tel' ||
          element.type === 'url'
            ? element.type
            : 'text'
        const label = compact(
          element.getAttribute('aria-label') ||
            element.placeholder ||
            element.title ||
            (element.name === 'q' ? 'Search' : element.name) ||
            'Text field',
          80
        )
        controls.push({
          kind: 'input',
          label,
          ...(element.name ? { name: element.name } : {}),
          ...(element.placeholder ? { placeholder: compact(element.placeholder, 160) } : {}),
          type: supportedType
        })
      }
      const inputStyle = window.getComputedStyle(input)
      const inputBounds = input.getBoundingClientRect()
      const buttonElement = elements.find(
        element =>
          element instanceof HTMLButtonElement ||
          (element instanceof HTMLInputElement && ['button', 'submit'].includes(element.type))
      )
      const buttonStyle = buttonElement ? window.getComputedStyle(buttonElement) : inputStyle
      const buttonBounds = buttonElement?.getBoundingClientRect()
      return {
        action: safeUrl(form.action),
        controls,
        method: form.method.toLowerCase() === 'post' ? 'post' : 'get',
        style: {
          buttonBackgroundColor: buttonStyle.backgroundColor,
          buttonBorderColor: buttonStyle.borderColor,
          buttonForegroundColor: buttonStyle.color,
          buttonHeight: measure(buttonBounds?.height ?? 40, 24, 80, 40),
          buttonRadius: measure(buttonStyle.borderRadius, 0, 60, 0),
          gap: 6,
          inputBackgroundColor: inputStyle.backgroundColor,
          inputBorderColor: inputStyle.borderColor,
          inputForegroundColor: inputStyle.color,
          inputHeight: measure(inputBounds.height, 24, 96, 44),
          inputRadius: measure(inputStyle.borderRadius, 0, 60, 0),
          inputWidth: measure(Math.min(inputBounds.width, window.innerWidth - 16), 160, 1200, 480)
        }
      }
    }
    const readButtonTheme = (element: HTMLElement): SiteVisualTheme['button'] => {
      const style = window.getComputedStyle(element)
      return {
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        foregroundColor: style.color,
        radius: measure(style.borderRadius, 0, 60, 0),
        style: Number.parseFloat(style.borderTopWidth) > 0 ? 'outline' : 'solid'
      }
    }
    const bodyChildren = Array.from(document.body.children).flatMap(element =>
      element instanceof HTMLElement && visible(element) ? [element] : []
    )
    const semanticHeader = document.querySelector<HTMLElement>('header')
    const inferredHeader = bodyChildren.find(element => {
      const bounds = element.getBoundingClientRect()
      return bounds.top <= 20 && bounds.height <= 160 && linksFrom(element).length > 0
    })
    const header = semanticHeader ?? inferredHeader
    const majorElements = Array.from(document.querySelectorAll<HTMLElement>('form, img'))
      .filter(visible)
      .filter(element => !header?.contains(element))
    const majorBottom = Math.max(
      ...majorElements.map(element => element.getBoundingClientRect().bottom),
      0
    )
    const footerThreshold = majorBottom > 0 ? majorBottom + 40 : window.innerHeight * 0.72
    const semanticFooter = document.querySelector<HTMLElement>('footer')
    /** Treat semantic or below-content links as footer navigation. */
    const isFooterLink = (link: HTMLAnchorElement) =>
      Boolean(semanticFooter?.contains(link)) || link.getBoundingClientRect().top >= footerThreshold
    const footerLinks = linksFrom(semanticFooter ?? document.body, link =>
      semanticFooter ? true : isFooterLink(link)
    )
    const navigation = header
      ? linksFrom(header)
      : linksFrom(document.body, link => link.getBoundingClientRect().bottom <= 160)
    const brandElement = header?.querySelector<HTMLElement>(
      'img, [class*="logo" i], [class*="brand" i], [aria-label*="home" i]'
    )
    const prominentHeaderLink = header
      ? Array.from(header.querySelectorAll<HTMLAnchorElement>('a[href]')).find(
          link => visible(link) && prominent(link) && compact(link.textContent, 80)
        )
      : undefined
    const button = prominentHeaderLink ? readButtonTheme(prominentHeaderLink) : undefined
    const candidateFingerprints = new Set<string>()
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>(
        'main > section, main > article, main > div, body > section'
      )
    )
      .filter(visible)
      .filter(candidate => {
        const heading = compact(candidate.querySelector('h1, h2, h3')?.textContent, 180)
        const body = compact(
          Array.from(candidate.querySelectorAll<HTMLElement>('p, li'))
            .filter(visible)
            .map(element => element.textContent)
            .join(' '),
          500
        )
        const image = largestImage(candidate)
        const form = Array.from(candidate.querySelectorAll<HTMLFormElement>('form')).find(visible)
        const fingerprint = `${heading}|${body}|${image ? imageUrl(image) : ''}`
        if (
          (!heading && body.length < 20 && !image && !form && linksFrom(candidate).length === 0) ||
          candidateFingerprints.has(fingerprint)
        )
          return false
        candidateFingerprints.add(fingerprint)
        return true
      })
    const containers = candidates.length > 0 ? candidates.slice(0, 12) : [document.body]
    const sections = containers.map(container => {
      const image = largestImage(container)
      const form = Array.from(container.querySelectorAll<HTMLFormElement>('form')).find(visible)
      const heading = container.querySelector<HTMLElement>('h1, h2, h3')
      const firstContentAfterImage = heading ?? form
      const imagePosition: 'after' | 'before' =
        image &&
        firstContentAfterImage &&
        image.compareDocumentPosition(firstContentAfterImage) & Node.DOCUMENT_POSITION_FOLLOWING
          ? 'before'
          : 'after'
      return {
        form: form ? readForm(form) : undefined,
        imageAspectRatio:
          image && image.naturalWidth > 0 && image.naturalHeight > 0
            ? Math.round((image.naturalWidth / image.naturalHeight) * 100) / 100
            : undefined,
        imagePosition,
        imageWidth: image
          ? measure(image.getBoundingClientRect().width, 24, 1440, image.naturalWidth || 320)
          : undefined,
        links: linksFrom(
          container,
          link => !header?.contains(link) && !isFooterLink(link) && !form?.contains(link)
        ).slice(0, 4)
      }
    })
    const footerText = Array.from(document.querySelectorAll<HTMLElement>('small, p'))
      .filter(element => visible(element) && element.getBoundingClientRect().top >= footerThreshold)
      .map(element => compact(element.textContent, 240))
      .find(text => text.length > 0)
    return {
      button,
      footerLinks,
      footerText,
      headerBrandVisible: Boolean(brandElement),
      navigation,
      sections
    }
  })
}
