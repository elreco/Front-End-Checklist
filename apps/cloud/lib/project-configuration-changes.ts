/** Compare persisted monitoring inputs without treating page ordering as interchangeable. */
export function projectConfigurationChanged(
  current: {
    authenticatedPages?: string[]
    pages: string[]
    secureRunnerRequired?: boolean
    url: string
  },
  next: {
    authenticatedPages?: string[]
    pages: string[]
    secureRunnerRequired?: boolean
    url: string
  }
): boolean {
  if ((current.secureRunnerRequired ?? false) !== (next.secureRunnerRequired ?? false)) return true
  if (current.url !== next.url || current.pages.length !== next.pages.length) return true
  if (current.pages.some((page, index) => page !== next.pages[index])) return true
  const currentAuthenticated = current.authenticatedPages ?? []
  const nextAuthenticated = next.authenticatedPages ?? []
  if (currentAuthenticated.length !== nextAuthenticated.length) return true
  return currentAuthenticated.some((page, index) => page !== nextAuthenticated[index])
}
