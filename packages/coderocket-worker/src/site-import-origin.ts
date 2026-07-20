/** Keep an imported project coherent when a discovered path redirects to another product or host. */
export function isSameWebsiteCapture(
  requestedSiteUrl: string,
  homepageSourceUrl: string,
  pageSourceUrl: string
): boolean {
  const allowedOrigins = new Set([
    new URL(requestedSiteUrl).origin,
    new URL(homepageSourceUrl).origin
  ])
  return allowedOrigins.has(new URL(pageSourceUrl).origin)
}
