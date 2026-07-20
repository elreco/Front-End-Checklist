import type { FigmaFileReference, FigmaScreenSelection } from './figma-source'

const FIGMA_API_ORIGIN = 'https://api.figma.com'
const MAX_FIGMA_RESPONSE_BYTES = 25 * 1024 * 1024
const MAX_DISCOVERED_SCREENS = 50
const SCREEN_NODE_TYPES = new Set(['COMPONENT', 'FRAME', 'GROUP', 'INSTANCE', 'SECTION'])

export interface FigmaColor {
  a?: number
  b: number
  g: number
  r: number
}

export interface FigmaPaint {
  color?: FigmaColor
  imageRef?: string
  opacity?: number
  type: string
  visible?: boolean
}

export interface FigmaNodeBounds {
  height: number
  width: number
  x?: number
  y?: number
}

export interface FigmaTextStyle {
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  letterSpacing?: number
  lineHeightPx?: number
  textAlignHorizontal?: string
}

export interface FigmaDocumentNode {
  absoluteBoundingBox?: FigmaNodeBounds
  characters?: string
  children?: FigmaDocumentNode[]
  cornerRadius?: number
  fills?: FigmaPaint[]
  id: string
  itemSpacing?: number
  layoutMode?: string
  name: string
  opacity?: number
  strokes?: FigmaPaint[]
  strokeWeight?: number
  style?: FigmaTextStyle
  type: string
  visible?: boolean
}

export interface FigmaScreenSummary extends FigmaScreenSelection {
  height: number
  thumbnailUrl?: string
  width: number
}

export interface FigmaFileScreenList {
  fileName: string
  screens: FigmaScreenSummary[]
  truncated: boolean
}

export interface FigmaScreenData extends FigmaScreenSelection {
  node: FigmaDocumentNode
  renderUrl?: string
}

export interface FigmaSelectedScreenData {
  fileName: string
  imageFillUrls: Map<string, string>
  screens: FigmaScreenData[]
}

export class FigmaApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'FigmaApiError'
    this.status = status
  }
}

/** List top-level design frames and bounded thumbnails for one owner-accessible Figma file. */
export async function listFigmaFileScreens(
  accessToken: string,
  reference: FigmaFileReference,
  fetchImplementation: typeof fetch = fetch
): Promise<FigmaFileScreenList> {
  const file = await figmaApiGet(
    `/v1/files/${encodeURIComponent(reference.fileKey)}?depth=2`,
    accessToken,
    fetchImplementation
  )
  const fileRecord = objectRecord(file)
  const root = readFigmaNode(fileRecord?.document)
  const allScreens = root ? discoverScreenNodes(root) : []
  const screens = allScreens.slice(0, MAX_DISCOVERED_SCREENS)
  const thumbnails = await renderFigmaNodes(
    accessToken,
    reference.fileKey,
    screens.map(screen => screen.id),
    0.25,
    fetchImplementation
  )
  return {
    fileName: boundedString(fileRecord?.name, 'Figma design', 120),
    screens: screens.map(screen => ({
      id: screen.id,
      name: screen.name,
      pageName: screen.pageName,
      width: Math.round(screen.bounds.width),
      height: Math.round(screen.bounds.height),
      thumbnailUrl: thumbnails.get(screen.id)
    })),
    truncated: allScreens.length > MAX_DISCOVERED_SCREENS
  }
}

/** Fetch full selected node trees, rendered frames, and original image-fill download links. */
export async function readFigmaSelectedScreens(
  accessToken: string,
  reference: FigmaFileReference,
  selections: FigmaScreenSelection[],
  fetchImplementation: typeof fetch = fetch
): Promise<FigmaSelectedScreenData> {
  const boundedSelections = selections.slice(0, 5)
  if (boundedSelections.length === 0)
    throw new FigmaApiError('Choose at least one Figma screen', 400)
  const ids = boundedSelections.map(selection => selection.id)
  const query = new URLSearchParams({ ids: ids.join(',') })
  const [nodesPayload, renderUrls, imageFillsPayload] = await Promise.all([
    figmaApiGet(
      `/v1/files/${encodeURIComponent(reference.fileKey)}/nodes?${query.toString()}`,
      accessToken,
      fetchImplementation
    ),
    renderFigmaNodes(accessToken, reference.fileKey, ids, 0.5, fetchImplementation),
    figmaApiGet(
      `/v1/files/${encodeURIComponent(reference.fileKey)}/images`,
      accessToken,
      fetchImplementation
    )
  ])
  const nodesRecord = objectRecord(objectRecord(nodesPayload)?.nodes)
  const imageFillUrls = readStringMap(objectRecord(imageFillsPayload)?.images)
  const screens = boundedSelections.flatMap(selection => {
    const nodeEnvelope = objectRecord(nodesRecord?.[selection.id])
    const node = readFigmaNode(nodeEnvelope?.document)
    return node
      ? [
          {
            ...selection,
            node,
            renderUrl: renderUrls.get(selection.id)
          }
        ]
      : []
  })
  if (screens.length === 0)
    throw new FigmaApiError('The selected Figma screens are unavailable', 404)
  return {
    fileName: boundedString(objectRecord(nodesPayload)?.name, 'Figma design', 120),
    imageFillUrls,
    screens
  }
}

interface DiscoveredScreen {
  bounds: FigmaNodeBounds
  id: string
  name: string
  pageName: string
}

/** Keep only page-sized top-level frames instead of icons and component fragments. */
function discoverScreenNodes(root: FigmaDocumentNode): DiscoveredScreen[] {
  return (root.children ?? []).flatMap(page => {
    if (page.type !== 'CANVAS' || page.visible === false) return []
    return (page.children ?? []).flatMap(child => {
      const candidates =
        child.type === 'SECTION' && child.children?.length
          ? child.children.filter(item => SCREEN_NODE_TYPES.has(item.type))
          : [child]
      return candidates.flatMap(candidate => {
        const bounds = candidate.absoluteBoundingBox
        if (
          candidate.visible === false ||
          !SCREEN_NODE_TYPES.has(candidate.type) ||
          !bounds ||
          bounds.width < 200 ||
          bounds.height < 200
        )
          return []
        return [
          {
            bounds,
            id: candidate.id,
            name: boundedString(candidate.name, 'Untitled screen', 120),
            pageName: boundedString(page.name, 'Page', 120)
          }
        ]
      })
    })
  })
}

/** Ask Figma for passive JPEG exports without exposing the account token to the browser. */
async function renderFigmaNodes(
  accessToken: string,
  fileKey: string,
  ids: string[],
  scale: number,
  fetchImplementation: typeof fetch
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const query = new URLSearchParams({ format: 'jpg', ids: ids.join(','), scale: String(scale) })
  const payload = await figmaApiGet(
    `/v1/images/${encodeURIComponent(fileKey)}?${query.toString()}`,
    accessToken,
    fetchImplementation
  )
  return readStringMap(objectRecord(payload)?.images)
}

/** Perform one bounded authenticated API read and keep provider errors free of response payloads. */
async function figmaApiGet(
  path: string,
  accessToken: string,
  fetchImplementation: typeof fetch
): Promise<unknown> {
  if (!accessToken || accessToken.length > 4096 || /[\r\n]/.test(accessToken))
    throw new FigmaApiError('The Figma connection is invalid', 401)
  const response = await fetchImplementation(`${FIGMA_API_ORIGIN}${path}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(20_000)
  })
  if (!response.ok) {
    const message =
      response.status === 401 || response.status === 403
        ? 'Figma could not open this file with the connected account'
        : response.status === 404
          ? 'The Figma file or screen could not be found'
          : response.status === 429
            ? 'Figma is temporarily limiting file reads'
            : 'Figma could not read this design right now'
    throw new FigmaApiError(message, response.status)
  }
  return readBoundedJson(response)
}

/** Read a JSON response with an explicit memory ceiling even when Content-Length is absent. */
async function readBoundedJson(response: Response): Promise<unknown> {
  const declaredLength = Number(response.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_FIGMA_RESPONSE_BYTES)
    throw new FigmaApiError('The Figma file is too large to inspect safely', 413)
  if (!response.body) return JSON.parse(await response.text())
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const part = await reader.read()
    if (part.done) break
    total += part.value.byteLength
    if (total > MAX_FIGMA_RESPONSE_BYTES) {
      await reader.cancel()
      throw new FigmaApiError('The Figma file is too large to inspect safely', 413)
    }
    chunks.push(part.value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    throw new FigmaApiError('Figma returned an unreadable file response', 502)
  }
}

/** Convert unknown JSON objects to new string-keyed records without unsafe type assertions. */
function objectRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return
  return Object.fromEntries(Object.entries(value))
}

/** Parse the Figma node subset needed for screen selection and deterministic reconstruction. */
function readFigmaNode(value: unknown): FigmaDocumentNode | undefined {
  const record = objectRecord(value)
  if (!record) return
  const id = boundedString(record.id, '', 160)
  const type = boundedString(record.type, '', 80)
  if (!(id && type)) return
  const children = Array.isArray(record.children)
    ? record.children.flatMap(child => {
        const parsed = readFigmaNode(child)
        return parsed ? [parsed] : []
      })
    : undefined
  return {
    id,
    type,
    name: boundedString(record.name, type, 160),
    visible: typeof record.visible === 'boolean' ? record.visible : undefined,
    opacity: finiteNumber(record.opacity),
    characters: boundedString(record.characters, '', 4_000) || undefined,
    children,
    absoluteBoundingBox: readBounds(record.absoluteBoundingBox),
    fills: readPaints(record.fills),
    strokes: readPaints(record.strokes),
    style: readTextStyle(record.style),
    cornerRadius: finiteNumber(record.cornerRadius),
    strokeWeight: finiteNumber(record.strokeWeight),
    itemSpacing: finiteNumber(record.itemSpacing),
    layoutMode: boundedString(record.layoutMode, '', 40) || undefined
  }
}

function readBounds(value: unknown): FigmaNodeBounds | undefined {
  const record = objectRecord(value)
  const width = finiteNumber(record?.width)
  const height = finiteNumber(record?.height)
  if (!(width && height && width > 0 && height > 0)) return
  return { width, height, x: finiteNumber(record?.x), y: finiteNumber(record?.y) }
}

function readPaints(value: unknown): FigmaPaint[] | undefined {
  if (!Array.isArray(value)) return
  return value.slice(0, 32).flatMap(entry => {
    const record = objectRecord(entry)
    const type = boundedString(record?.type, '', 40)
    if (!type) return []
    return [
      {
        type,
        visible: typeof record?.visible === 'boolean' ? record.visible : undefined,
        opacity: finiteNumber(record?.opacity),
        imageRef: boundedString(record?.imageRef, '', 240) || undefined,
        color: readColor(record?.color)
      }
    ]
  })
}

function readColor(value: unknown): FigmaColor | undefined {
  const record = objectRecord(value)
  const r = finiteNumber(record?.r)
  const g = finiteNumber(record?.g)
  const b = finiteNumber(record?.b)
  if (r === undefined || g === undefined || b === undefined) return
  return { r, g, b, a: finiteNumber(record?.a) }
}

function readTextStyle(value: unknown): FigmaTextStyle | undefined {
  const record = objectRecord(value)
  if (!record) return
  return {
    fontFamily: boundedString(record.fontFamily, '', 160) || undefined,
    fontSize: finiteNumber(record.fontSize),
    fontWeight: finiteNumber(record.fontWeight),
    letterSpacing: finiteNumber(record.letterSpacing),
    lineHeightPx: finiteNumber(record.lineHeightPx),
    textAlignHorizontal: boundedString(record.textAlignHorizontal, '', 40) || undefined
  }
}

function readStringMap(value: unknown): Map<string, string> {
  const record = objectRecord(value)
  return new Map(
    Object.entries(record ?? {}).flatMap(([key, entry]) =>
      typeof entry === 'string' && entry.startsWith('https://') ? [[key, entry]] : []
    )
  )
}

function boundedString(value: unknown, fallback: string, maximumLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maximumLength) || fallback : fallback
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}
