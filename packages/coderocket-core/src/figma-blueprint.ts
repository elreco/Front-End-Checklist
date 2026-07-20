import type { FigmaColor, FigmaDocumentNode, FigmaPaint, FigmaScreenData } from './figma-api'
import { type FigmaFileReference, figmaNodeUrl } from './figma-source'
import type {
  SiteSourceBlueprint,
  SourceContentItem,
  SourceLink,
  SourceSectionBlueprint
} from './site-source-blueprint'
import type { SiteSectionVisualStyle, SiteVisualTheme } from './site-visual-style'

export interface CreateFigmaBlueprintOptions {
  fileName: string
  imageFillUrls: Map<string, string>
  navigation: SourceLink[]
  reference: FigmaFileReference
  screen: FigmaScreenData
}

/** Convert one selected frame into the same bounded source blueprint used by website imports. */
export function createFigmaScreenBlueprint(
  options: CreateFigmaBlueprintOptions
): SiteSourceBlueprint {
  const { fileName, imageFillUrls, navigation, reference, screen } = options
  const allNodes = flattenVisibleNodes(screen.node)
  const textNodes = allNodes.filter(node => node.type === 'TEXT' && Boolean(clean(node.characters)))
  const rootBackground = solidColor(screen.node.fills) ?? '#ffffff'
  const foreground = textColor(largestTextNode(textNodes)) ?? contrastingColor(rootBackground)
  const accent = findAccentColor(allNodes, rootBackground, foreground)
  const sectionNodes = findSectionNodes(screen.node)
  const sections = sectionNodes
    .map((node, index) =>
      createSection(node, index, imageFillUrls, reference, rootBackground, foreground)
    )
    .filter(section =>
      Boolean(section.heading || section.body || section.imageUrl || section.items?.length)
    )
    .slice(0, 12)
  const firstHeading = sections.find(section => section.heading)?.heading
  const firstBody = sections.find(section => section.body)?.body
  return {
    accentColor: accent,
    backgroundColor: rootBackground,
    brandName: clean(fileName, 120) || clean(screen.name, 120) || 'Figma design',
    capturedAt: new Date().toISOString(),
    description:
      firstBody || `Editable recreation of ${clean(screen.name, 120) || 'a Figma screen'}.`,
    foregroundColor: foreground,
    footerLinks: [],
    footerText: footerTextFrom(screen.node),
    headerBrandVisible: true,
    navigation: navigation.slice(0, 8),
    sections:
      sections.length > 0
        ? sections
        : [fallbackSection(screen.node, imageFillUrls, rootBackground, foreground)],
    sourceUrl: figmaNodeUrl(reference, screen.id),
    title: firstHeading || clean(screen.name, 180) || clean(fileName, 180) || 'Figma screen',
    visualAnalysis: 'responsive-dom',
    visualTheme: createVisualTheme(allNodes, rootBackground, foreground, accent)
  }
}

/** Prefer authored top-level layout groups while keeping header and footer metadata out of content. */
function findSectionNodes(root: FigmaDocumentNode): FigmaDocumentNode[] {
  const candidates = (root.children ?? []).filter(node => {
    const name = node.name.toLowerCase()
    const bounds = node.absoluteBoundingBox
    return (
      node.visible !== false &&
      !name.includes('header') &&
      !name.includes('navigation') &&
      !name.includes('navbar') &&
      !name.includes('footer') &&
      Boolean(bounds && bounds.width >= 160 && bounds.height >= 40)
    )
  })
  return candidates.length > 0 ? candidates : [root]
}

function createSection(
  node: FigmaDocumentNode,
  index: number,
  imageFillUrls: Map<string, string>,
  reference: FigmaFileReference,
  fallbackBackground: string,
  fallbackForeground: string
): SourceSectionBlueprint {
  const descendants = flattenVisibleNodes(node)
  const texts = descendants.filter(item => item.type === 'TEXT' && Boolean(clean(item.characters)))
  const headingNode = largestTextNode(texts)
  const heading = clean(headingNode?.characters, 180)
  const body = texts
    .filter(item => item.id !== headingNode?.id)
    .map(item => clean(item.characters, 500))
    .filter(Boolean)
    .filter((value, valueIndex, values) => values.indexOf(value) === valueIndex)
    .slice(0, index === 0 ? 3 : 5)
    .join(' ')
    .slice(0, 1200)
  const imageNode = descendants.find(item => Boolean(imageUrlFrom(item, imageFillUrls)))
  const imageUrl = imageNode ? imageUrlFrom(imageNode, imageFillUrls) : undefined
  const backgroundColor = solidColor(node.fills) ?? fallbackBackground
  const foregroundColor = textColor(headingNode ?? texts[0]) ?? fallbackForeground
  return {
    backgroundColor,
    body,
    foregroundColor,
    heading,
    imageAlt: imageUrl ? clean(imageNode?.name, 240) || 'Design image' : undefined,
    imageMobileWidth: imageNode?.absoluteBoundingBox
      ? clampInteger(imageNode.absoluteBoundingBox.width, 24, 1_440)
      : undefined,
    imageUrl,
    imageWidth: imageNode?.absoluteBoundingBox
      ? clampInteger(imageNode.absoluteBoundingBox.width, 24, 1_440)
      : undefined,
    items: repeatedItemsFrom(node, imageFillUrls, reference),
    layout: sectionLayout(node, headingNode, Boolean(imageUrl)),
    links: buttonLinksFrom(descendants, reference),
    visual: createSectionVisual(node, headingNode, texts, imageNode)
  }
}

/** Preserve repeated cards as editable collections when direct siblings carry meaningful content. */
function repeatedItemsFrom(
  node: FigmaDocumentNode,
  imageFillUrls: Map<string, string>,
  reference: FigmaFileReference
): SourceContentItem[] | undefined {
  const candidates = (node.children ?? []).flatMap(child => {
    const descendants = flattenVisibleNodes(child)
    const texts = descendants.filter(
      item => item.type === 'TEXT' && Boolean(clean(item.characters))
    )
    const titleNode = largestTextNode(texts)
    const title = clean(titleNode?.characters, 180)
    const imageNode = descendants.find(item => Boolean(imageUrlFrom(item, imageFillUrls)))
    const imageUrl = imageNode ? imageUrlFrom(imageNode, imageFillUrls) : undefined
    if (!(title || imageUrl)) return []
    return [
      {
        title: title || clean(imageNode?.name, 180) || 'Item',
        body: texts
          .filter(item => item.id !== titleNode?.id)
          .map(item => clean(item.characters, 240))
          .filter(Boolean)
          .slice(0, 3)
          .join(' ')
          .slice(0, 500),
        imageAlt: imageUrl ? clean(imageNode?.name, 240) || 'Design image' : undefined,
        imageUrl,
        links: buttonLinksFrom(descendants, reference).slice(0, 2),
        price: findPrice(texts)
      }
    ]
  })
  return candidates.length >= 2 && candidates.length <= 12 ? candidates : undefined
}

function buttonLinksFrom(nodes: FigmaDocumentNode[], reference: FigmaFileReference): SourceLink[] {
  return nodes
    .filter(node => /button|btn|cta|action/i.test(node.name))
    .flatMap(node => {
      const label = flattenVisibleNodes(node)
        .filter(item => item.type === 'TEXT')
        .map(item => clean(item.characters, 80))
        .find(Boolean)
      return label ? [{ href: figmaNodeUrl(reference, node.id), label, prominent: true }] : []
    })
    .filter(
      (link, index, links) => links.findIndex(candidate => candidate.label === link.label) === index
    )
    .slice(0, 4)
}

function createVisualTheme(
  nodes: FigmaDocumentNode[],
  background: string,
  foreground: string,
  accent: string
): SiteVisualTheme {
  const textNodes = nodes.filter(node => node.type === 'TEXT' && Boolean(node.style?.fontFamily))
  const heading = largestTextNode(textNodes)
  const header = nodes.find(node => /header|navigation|navbar/i.test(node.name))
  const button = nodes.find(node => /button|btn|cta|action/i.test(node.name))
  const buttonText = button
    ? flattenVisibleNodes(button).find(node => node.type === 'TEXT')
    : undefined
  return {
    fontFamily: clean(textNodes[0]?.style?.fontFamily, 160) || 'Arial, Helvetica, sans-serif',
    headingFontFamily:
      clean(heading?.style?.fontFamily, 160) ||
      clean(textNodes[0]?.style?.fontFamily, 160) ||
      'Arial, Helvetica, sans-serif',
    header: {
      backgroundColor: solidColor(header?.fills) ?? background,
      foregroundColor: textColor(buttonText) ?? foreground,
      borderColor: solidColor(header?.strokes) ?? background,
      height: clampInteger(header?.absoluteBoundingBox?.height ?? 72, 48, 120),
      position: 'static'
    },
    button: {
      backgroundColor: solidColor(button?.fills) ?? accent,
      foregroundColor: textColor(buttonText) ?? contrastingColor(accent),
      borderColor: solidColor(button?.strokes) ?? accent,
      radius: clampInteger(button?.cornerRadius ?? 8, 0, 60),
      style: solidColor(button?.fills) ? 'solid' : 'outline'
    }
  }
}

function createSectionVisual(
  node: FigmaDocumentNode,
  heading: FigmaDocumentNode | undefined,
  texts: FigmaDocumentNode[],
  image: FigmaDocumentNode | undefined
): SiteSectionVisualStyle {
  const bounds = node.absoluteBoundingBox
  const bodyNode = texts.find(item => item.id !== heading?.id)
  const headingSize = clampInteger(heading?.style?.fontSize ?? 40, 20, 120)
  const bodySize = clampInteger(bodyNode?.style?.fontSize ?? 16, 12, 32)
  const width = clampInteger(bounds?.width ?? 1_024, 320, 1_440)
  const imageBounds = image?.absoluteBoundingBox
  return {
    desktop: {
      bodySize,
      contentWidth: width,
      gap: clampInteger(node.itemSpacing ?? 32, 8, 120),
      headingSize,
      paddingBlock: clampInteger((bounds?.height ?? 240) * 0.12, 16, 240),
      textAlign: textAlignment(heading)
    },
    mobile: {
      bodySize: clampInteger(bodySize, 12, 20),
      contentWidth: 390,
      gap: clampInteger((node.itemSpacing ?? 32) * 0.75, 8, 80),
      headingSize: clampInteger(headingSize * 0.68, 20, 64),
      paddingBlock: clampInteger((bounds?.height ?? 240) * 0.08, 16, 120),
      textAlign: textAlignment(heading)
    },
    headingFontFamily: clean(heading?.style?.fontFamily, 160) || 'Arial, Helvetica, sans-serif',
    headingFontWeight: clampInteger(heading?.style?.fontWeight ?? 700, 100, 900),
    headingLineHeight: clampRatio(
      heading?.style?.lineHeightPx && heading.style.fontSize
        ? heading.style.lineHeightPx / heading.style.fontSize
        : 1.1,
      0.75,
      2
    ),
    headingLetterSpacing: clampRatio(heading?.style?.letterSpacing ?? 0, -8, 12),
    bodyLineHeight: clampRatio(
      bodyNode?.style?.lineHeightPx && bodyNode.style.fontSize
        ? bodyNode.style.lineHeightPx / bodyNode.style.fontSize
        : 1.5,
      1,
      2.5
    ),
    borderRadius: clampInteger(node.cornerRadius ?? 0, 0, 80),
    borderWidth: clampInteger(node.strokeWeight ?? 0, 0, 4),
    borderColor: solidColor(node.strokes) ?? 'rgba(0, 0, 0, 0)',
    elevation: 'none',
    imageAspectRatio: clampRatio(
      imageBounds ? imageBounds.width / imageBounds.height : 1.5,
      0.4,
      3
    ),
    imageFit: 'cover',
    imagePosition: node.layoutMode === 'HORIZONTAL' ? 'after' : 'before',
    backgroundImage: ''
  }
}

function fallbackSection(
  node: FigmaDocumentNode,
  imageFillUrls: Map<string, string>,
  backgroundColor: string,
  foregroundColor: string
): SourceSectionBlueprint {
  const imageUrl = imageUrlFrom(node, imageFillUrls)
  return {
    backgroundColor,
    body: '',
    foregroundColor,
    heading: clean(node.name, 180) || 'Figma screen',
    imageAlt: imageUrl ? clean(node.name, 240) || 'Figma screen' : undefined,
    imageUrl,
    layout: imageUrl ? 'split' : 'stacked',
    links: []
  }
}

function flattenVisibleNodes(root: FigmaDocumentNode): FigmaDocumentNode[] {
  if (root.visible === false || root.opacity === 0) return []
  return [root, ...(root.children ?? []).flatMap(flattenVisibleNodes)]
}

function largestTextNode(nodes: FigmaDocumentNode[]): FigmaDocumentNode | undefined {
  return [...nodes].sort(
    (left, right) => (right.style?.fontSize ?? 0) - (left.style?.fontSize ?? 0)
  )[0]
}

function imageUrlFrom(node: FigmaDocumentNode, images: Map<string, string>): string | undefined {
  const imageRef = node.fills?.find(
    paint => paint.type === 'IMAGE' && paint.visible !== false
  )?.imageRef
  return imageRef ? images.get(imageRef) : undefined
}

function solidColor(paints?: FigmaPaint[]): string | undefined {
  const paint = paints?.find(item => item.type === 'SOLID' && item.visible !== false && item.color)
  return paint?.color ? cssColor(paint.color, paint.opacity) : undefined
}

function textColor(node?: FigmaDocumentNode): string | undefined {
  return solidColor(node?.fills)
}

function cssColor(color: FigmaColor, opacity = 1): string {
  const alpha = clampRatio((color.a ?? 1) * opacity, 0, 1)
  const red = clampInteger(color.r * 255, 0, 255)
  const green = clampInteger(color.g * 255, 0, 255)
  const blue = clampInteger(color.b * 255, 0, 255)
  if (alpha < 0.995) return `rgba(${red}, ${green}, ${blue}, ${alpha})`
  return `#${[red, green, blue].map(value => value.toString(16).padStart(2, '0')).join('')}`
}

function findAccentColor(
  nodes: FigmaDocumentNode[],
  background: string,
  foreground: string
): string {
  const button = nodes.find(node => /button|btn|cta|action/i.test(node.name))
  const buttonColor = solidColor(button?.fills)
  if (buttonColor) return buttonColor
  return (
    nodes
      .map(node => solidColor(node.fills))
      .find(color => color && color !== background && color !== foreground) ?? '#5b5bd6'
  )
}

function contrastingColor(background: string): string {
  const hex = background.match(/^#([a-f\d]{6})$/i)?.[1]
  if (!hex) return '#111827'
  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)
  return red * 0.299 + green * 0.587 + blue * 0.114 > 160 ? '#111827' : '#ffffff'
}

function sectionLayout(
  node: FigmaDocumentNode,
  heading: FigmaDocumentNode | undefined,
  hasImage: boolean
): 'centered' | 'split' | 'stacked' {
  if (node.layoutMode === 'HORIZONTAL' && hasImage) return 'split'
  return textAlignment(heading) === 'center' ? 'centered' : 'stacked'
}

function textAlignment(node?: FigmaDocumentNode): 'center' | 'left' | 'right' {
  if (node?.style?.textAlignHorizontal === 'CENTER') return 'center'
  if (node?.style?.textAlignHorizontal === 'RIGHT') return 'right'
  return 'left'
}

function footerTextFrom(root: FigmaDocumentNode): string | undefined {
  const footer = flattenVisibleNodes(root).find(node => /footer/i.test(node.name))
  if (!footer) return
  const text = flattenVisibleNodes(footer)
    .filter(node => node.type === 'TEXT')
    .map(node => clean(node.characters, 120))
    .filter(Boolean)
    .slice(0, 3)
    .join(' · ')
  return text.slice(0, 240) || undefined
}

function findPrice(nodes: FigmaDocumentNode[]): string | undefined {
  return nodes
    .map(node => clean(node.characters, 80))
    .find(value => /(?:€|\$|£)\s?\d|\d\s?(?:€|\$|£)/.test(value))
}

function clean(value?: string, maximumLength = 1_200): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, maximumLength)
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  return Math.round(Math.max(minimum, Math.min(maximum, value)))
}

function clampRatio(value: number, minimum: number, maximum: number): number {
  return Math.round(Math.max(minimum, Math.min(maximum, value)) * 100) / 100
}
