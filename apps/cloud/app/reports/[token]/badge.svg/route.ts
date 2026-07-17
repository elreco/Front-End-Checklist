import type { WebsiteLevel } from '@coderocket/core/website-level'
import { getSharedReport } from '@/lib/shared-report-data'
import { getWebsiteLevelPresentation } from '@/lib/website-level-presentation'

const LEVEL_COLORS: Record<WebsiteLevel, string> = {
  unverified: '#a1a1aa',
  needs_attention: '#fb7185',
  bronze: '#c9834b',
  silver: '#b8c0cc',
  gold: '#f4c95d',
  platinum: '#67e8f9'
}

/** Serve a small embeddable badge tied to one revocable report snapshot. */
export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  const report = await getSharedReport(token)
  if (!report) return new Response('Badge unavailable', { status: 404 })

  const presentation = getWebsiteLevelPresentation(report.level.level)
  const color = LEVEL_COLORS[report.level.level]
  const projectName = truncate(report.project.name, 28)
  const levelLabel = presentation.label
  const projectWidth = Math.max(96, projectName.length * 7 + 28)
  const levelWidth = Math.max(90, levelLabel.length * 7 + 30)
  const width = 112 + projectWidth + levelWidth
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="42" viewBox="0 0 ${width} 42" role="img" aria-label="${escapeXml(projectName)}: ${escapeXml(levelLabel)} website health level">
  <rect width="${width}" height="42" fill="#09090b"/>
  <rect x=".5" y=".5" width="${width - 1}" height="41" fill="none" stroke="#3f3f46"/>
  <path d="M18 9C14 14 12 19 12 24l-5 5c-.7.7-.7 1.4 0 2.1 3 3 6 5.7 9.5 7.9-2.2-4.3-3.5-7.8-3.5-10 0-.9.4-1.7 1.2-2.4l2.3-2.2c.3-3.4 1-6.4 2.5-8.9 1.4 2.5 2.2 5.5 2.5 8.9l2.3 2.2c.8.7 1.2 1.5 1.2 2.4 0 2.2-1.3 5.7-3.5 10 3.5-2.2 6.5-4.9 9.5-7.9.7-.7.7-1.4 0-2.1l-5-5c0-5-2-10-6-15Z" fill="#fafafa" transform="rotate(45 18 24)"/>
  <text x="43" y="26" fill="#fafafa" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12" font-weight="700">CodeRocket</text>
  <line x1="112" y1="1" x2="112" y2="41" stroke="#3f3f46"/>
  <text x="126" y="26" fill="#fafafa" font-family="system-ui, sans-serif" font-size="12" font-weight="600">${escapeXml(projectName)}</text>
  <line x1="${112 + projectWidth}" y1="1" x2="${112 + projectWidth}" y2="41" stroke="#3f3f46"/>
  <circle cx="${126 + projectWidth}" cy="21" r="4" fill="${color}"/>
  <text x="${137 + projectWidth}" y="26" fill="${color}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" font-weight="700" letter-spacing=".5">${escapeXml(levelLabel.toUpperCase())}</text>
</svg>`

  return new Response(svg, {
    headers: {
      'cache-control': 'private, max-age=60, no-transform',
      'content-type': 'image/svg+xml; charset=utf-8',
      'x-robots-tag': 'noindex, nofollow'
    }
  })
}

/** Keep badge text within a predictable embeddable width. */
function truncate(value: string, maximum: number): string {
  return value.length > maximum ? `${value.slice(0, maximum - 1)}…` : value
}

/** Escape user-controlled project names before placing them in SVG text and attributes. */
function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}
