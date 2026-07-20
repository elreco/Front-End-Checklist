export interface RepresentativePageTarget {
  path: string
  url: string
}

const UNHELPFUL_PUBLIC_SEGMENTS = new Set([
  'account',
  'auth',
  'cart',
  'checkout',
  'login',
  'logout',
  'search',
  'signin',
  'signup'
])
const UNHELPFUL_PRIVATE_SEGMENTS = new Set(['auth', 'login', 'logout', 'signin', 'signup'])

/** Select a small set of useful page types instead of recreating every discovered URL. */
export function selectRepresentativePageTargets(
  sourceUrl: string,
  discoveredPaths: string[],
  limit = 5,
  authenticated = false
): RepresentativePageTarget[] {
  const source = new URL(sourceUrl)
  const maximum = Math.max(1, Math.min(5, limit))
  const targets: RepresentativePageTarget[] = [
    {
      path: source.pathname === '/' ? '/' : normalizePath(source.pathname),
      url: source.toString()
    }
  ]
  const seenPaths = new Set(targets.map(target => target.path))
  const seenTemplates = new Set(targets.map(target => pageTemplate(target.path)))
  const candidates = discoveredPaths
    .map(normalizePath)
    .filter(path => !seenPaths.has(path) && isUsefulPath(path, authenticated))
    .sort((left, right) => pagePriority(right) - pagePriority(left))

  for (const path of candidates) {
    if (targets.length >= maximum) break
    const template = pageTemplate(path)
    if (seenTemplates.has(template)) continue
    seenPaths.add(path)
    seenTemplates.add(template)
    targets.push({ path, url: new URL(path, source.origin).toString() })
  }
  return targets
}

/** Collapse locale prefixes and repeated record URLs into one human-sized page type. */
export function pageTemplate(path: string): string {
  const segments = path.split('/').filter(Boolean)
  const withoutLocale =
    segments[0] && /^[a-z]{2}(?:-[a-z]{2})?$/i.test(segments[0]) ? segments.slice(1) : segments
  if (withoutLocale.length === 0) return 'home'
  const joined = withoutLocale.join('/').toLowerCase()
  if (/\b(contact|support|help)\b/.test(joined)) return 'contact'
  if (/\b(about|company|story|team|a-propos)\b/.test(joined)) return 'about'
  if (/\b(pricing|plans|tarifs)\b/.test(joined)) return 'pricing'
  if (/\b(blog|news|journal|articles?)\b/.test(joined))
    return withoutLocale.length > 1 ? 'article-detail' : 'articles'
  if (
    /\b(product|products|shop|store|catalog|collection|collections|category|categories)\b/.test(
      joined
    )
  )
    return withoutLocale.length > 1 ? 'catalog-detail' : 'catalog'
  if (withoutLocale[0] === 't' || withoutLocale[0] === 'p') return 'catalog-detail'
  if (withoutLocale[0] === 'w' || withoutLocale[0] === 'c') return 'catalog'
  return withoutLocale.length > 1 ? `${withoutLocale[0]}-detail` : (withoutLocale[0] ?? 'other')
}

/** Normalize crawler output to one path without query strings or fragments. */
function normalizePath(value: string): string {
  try {
    const url = new URL(value, 'https://example.com')
    const normalized = url.pathname.replace(/\/{2,}/g, '/')
    return normalized === '/' ? '/' : normalized.replace(/\/$/, '')
  } catch {
    return '/'
  }
}

/** Skip private journeys and obvious non-page assets before opening a browser. */
function isUsefulPath(path: string, authenticated: boolean): boolean {
  const segments = path.toLowerCase().split('/').filter(Boolean)
  const excluded = authenticated ? UNHELPFUL_PRIVATE_SEGMENTS : UNHELPFUL_PUBLIC_SEGMENTS
  if (segments.some(segment => excluded.has(segment))) return false
  return !/\.(?:avif|css|gif|ico|jpe?g|js|json|pdf|png|svg|webp|xml)$/i.test(path)
}

/** Prefer common business pages and shallow routes when choosing a first useful version. */
function pagePriority(path: string): number {
  const template = pageTemplate(path)
  const priority: Record<string, number> = {
    contact: 100,
    catalog: 95,
    'catalog-detail': 90,
    pricing: 85,
    about: 80,
    articles: 70,
    'article-detail': 65
  }
  return (priority[template] ?? 40) - path.split('/').filter(Boolean).length
}
