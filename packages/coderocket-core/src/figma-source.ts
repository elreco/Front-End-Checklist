const FIGMA_FILE_TYPES = new Set(['board', 'design', 'file', 'make', 'proto', 'slides'])
const FIGMA_FILE_KEY_PATTERN = /^[a-z\d_-]{6,128}$/i
const FIGMA_NODE_ID_PATTERN = /^\d+(?::\d+)+$/

export interface FigmaFileReference {
  fileKey: string
  fileType: string
  nodeId?: string
  url: string
}

export interface FigmaScreenSelection {
  id: string
  name: string
  pageName?: string
}

/** Parse one normal Figma file link without retaining tracking or collaboration query values. */
export function parseFigmaFileUrl(value: string): FigmaFileReference | undefined {
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' || !['figma.com', 'www.figma.com'].includes(url.hostname)) return
    if (url.username || url.password) return
    const [fileType, fileKey, fileName] = url.pathname.split('/').filter(Boolean)
    if (
      !(
        fileType &&
        fileKey &&
        FIGMA_FILE_TYPES.has(fileType) &&
        FIGMA_FILE_KEY_PATTERN.test(fileKey)
      )
    )
      return
    const nodeId = normalizeFigmaNodeId(url.searchParams.get('node-id') ?? undefined)
    const decodedFileName = fileName ? decodeURIComponent(fileName) : 'design'
    const canonical = new URL(
      `https://www.figma.com/${fileType}/${fileKey}/${encodeURIComponent(decodedFileName)}`
    )
    if (nodeId) canonical.searchParams.set('node-id', nodeId.replaceAll(':', '-'))
    return { fileKey, fileType, nodeId, url: canonical.toString() }
  } catch {
    return
  }
}

/** Accept the colon or URL-safe hyphen spelling used for Figma node identifiers. */
export function normalizeFigmaNodeId(value?: string): string | undefined {
  if (!value) return
  const normalized = value.trim().replaceAll('-', ':')
  return FIGMA_NODE_ID_PATTERN.test(normalized) ? normalized : undefined
}

/** Build a stable link to one source frame without carrying an OAuth or share token. */
export function figmaNodeUrl(reference: FigmaFileReference, nodeId: string): string {
  const url = new URL(reference.url)
  url.searchParams.set('node-id', nodeId.replaceAll(':', '-'))
  return url.toString()
}

/** Create collision-free generated page paths while keeping the first selected screen as home. */
export function createFigmaScreenPaths(names: string[]): string[] {
  const used = new Set<string>()
  return names.map((name, index) => {
    if (index === 0) {
      used.add('/')
      return '/'
    }
    const base = slugifyFigmaScreenName(name) || `screen-${index + 1}`
    let candidate = `/${base}`
    let suffix = 2
    while (used.has(candidate)) {
      candidate = `/${base}-${suffix}`
      suffix += 1
    }
    used.add(candidate)
    return candidate
  })
}

/** Keep frame labels readable while producing a safe route segment. */
export function slugifyFigmaScreenName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z\d]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}
