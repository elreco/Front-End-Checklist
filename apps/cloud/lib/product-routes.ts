export const AUTHENTICATED_PRODUCT_PREFIXES = [
  '/dashboard',
  '/settings',
  '/create',
  '/studio',
  '/websites'
]

const CHROME_FREE_PREFIXES = [...AUTHENTICATED_PRODUCT_PREFIXES, '/login', '/recover', '/s']

/** Match one route prefix without treating similar path names as children. */
function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

/** Return whether a route belongs to the authenticated dashboard product. */
export function isAuthenticatedProductRoute(pathname: string): boolean {
  return AUTHENTICATED_PRODUCT_PREFIXES.some(prefix => matchesPrefix(pathname, prefix))
}

/** Return whether a route must omit the landing-page header and footer. */
export function isChromeFreeRoute(pathname: string): boolean {
  return CHROME_FREE_PREFIXES.some(prefix => matchesPrefix(pathname, prefix))
}
