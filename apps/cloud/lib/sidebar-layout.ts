/** Return whether the current screen is part of the website creation Studio. */
export function isStudioWorkspaceRoute(pathname: string): boolean {
  return pathname === '/studio' || pathname.startsWith('/studio/')
}

/**
 * Keep Studio workspaces compact by default without replacing the user's saved sidebar choice.
 */
export function resolveSidebarCollapsed({
  expandedStudioPath,
  pathname,
  preferredCollapsed
}: {
  expandedStudioPath?: string
  pathname: string
  preferredCollapsed: boolean
}): boolean {
  if (!isStudioWorkspaceRoute(pathname)) return preferredCollapsed
  return expandedStudioPath !== pathname
}
