'use client'

import type { SiteAccessMode } from '@coderocket/core'
import { toast } from '@repo/design-system/ui/coderocket-toast'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { projectConfigurationChanged } from '@/lib/project-configuration-changes'
import type { ProjectEmailAlerts } from '@/lib/project-data-types'
import {
  isProjectConfigurationSaveResponse,
  type ProjectSiteEditorProps,
  readProjectConfigurationError,
  safeHttpsOrigin
} from '@/lib/project-site-editor'

/** Manage one reversible site-settings draft and persist it through the project API. */
export function useProjectSiteSettings(props: ProjectSiteEditorProps) {
  const router = useRouter()
  const managedAccessConnected = props.managedAccessConnected ?? false
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(props.name)
  const [url, setUrl] = useState(props.siteUrl)
  const [pages, setPages] = useState(props.pages)
  const [accessMode, setAccessMode] = useState<SiteAccessMode>(
    getEditableAccessMode(props.accessMode, props.authenticatedPages, props.pages)
  )
  const [authenticatedPages, setAuthenticatedPages] = useState(props.authenticatedPages)
  const [secureRunnerRequired, setSecureRunnerRequired] = useState(props.secureRunnerRequired)
  const [emailAlerts, setEmailAlerts] = useState(props.emailAlerts)
  const [error, setError] = useState('')
  const currentOrigin = safeHttpsOrigin(props.siteUrl)
  const nextOrigin = safeHttpsOrigin(url)
  const originChanged = Boolean(nextOrigin && currentOrigin && nextOrigin !== currentOrigin)
  const effectiveAuthenticatedPages = getEffectiveAuthenticatedPages(
    accessMode,
    authenticatedPages,
    pages
  )
  const nextStoredSecureRunnerRequired =
    getDerivedAccessMode(pages, effectiveAuthenticatedPages, secureRunnerRequired) !== 'public' &&
    !managedAccessConnected
  const monitoringChanged = projectConfigurationChanged(
    {
      authenticatedPages: props.authenticatedPages,
      pages: props.pages,
      secureRunnerRequired: props.secureRunnerRequired,
      url: props.siteUrl
    },
    {
      authenticatedPages: effectiveAuthenticatedPages,
      pages,
      secureRunnerRequired: nextStoredSecureRunnerRequired,
      url
    }
  )
  const settingsChanged =
    name.trim() !== props.name ||
    emailAlerts.enabled !== props.emailAlerts.enabled ||
    emailAlerts.newProblems !== props.emailAlerts.newProblems ||
    emailAlerts.checkFailures !== props.emailAlerts.checkFailures
  const hasChanges = monitoringChanged || settingsChanged
  const checkAfterSave =
    monitoringChanged &&
    !nextStoredSecureRunnerRequired &&
    (effectiveAuthenticatedPages.length === 0 || managedAccessConnected)

  /** Reset draft values whenever the dialog starts a new editing session. */
  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) return
    setName(props.name)
    setUrl(props.siteUrl)
    setPages(props.pages)
    setAccessMode(getEditableAccessMode(props.accessMode, props.authenticatedPages, props.pages))
    setAuthenticatedPages(props.authenticatedPages)
    setSecureRunnerRequired(props.secureRunnerRequired)
    setEmailAlerts(props.emailAlerts)
    setError('')
  }

  /** Keep page-level session choices valid while one path is edited. */
  function updatePage(index: number, value: string) {
    setPages(current => {
      const previousPage = current[index]
      const nextPages = current.map((page, pageIndex) => (pageIndex === index ? value : page))
      setAuthenticatedPages(currentAuthenticated => {
        if (accessMode === 'private') return nextPages.filter(page => page.trim())
        if (!previousPage || !currentAuthenticated.includes(previousPage))
          return currentAuthenticated
        return currentAuthenticated
          .map(page => (page === previousPage ? value : page))
          .filter(Boolean)
      })
      return nextPages
    })
    setError('')
  }

  /** Replace the current page draft with a reviewed discovery or import selection. */
  function replacePages(nextPages: string[]) {
    setPages(nextPages)
    setAuthenticatedPages(current =>
      accessMode === 'private' ? nextPages : current.filter(page => nextPages.includes(page))
    )
    setError('')
  }

  /** Remove one page while preserving at least one monitored URL. */
  function removePage(index: number) {
    if (pages.length === 1) {
      setError('Keep at least one page to monitor.')
      return
    }
    const removedPage = pages[index]
    setPages(current => current.filter((_, pageIndex) => pageIndex !== index))
    if (removedPage) setAuthenticatedPages(current => current.filter(path => path !== removedPage))
  }

  /** Switch one page between anonymous and dedicated signed-in rendering. */
  function togglePageAccess(page: string) {
    if (!page.trim()) return
    setAuthenticatedPages(current =>
      current.includes(page) ? current.filter(path => path !== page) : [...current, page]
    )
    setError('')
  }

  /** Apply the same visitor-state model used during onboarding. */
  function changeAccessMode(mode: SiteAccessMode) {
    setAccessMode(mode)
    if (mode === 'public') setAuthenticatedPages([])
    if (mode === 'private') setAuthenticatedPages(pages.filter(page => page.trim()))
    setError('')
  }

  /** Turn an empty enabled channel into a clear disabled state. */
  function changeEmailAlerts(next: ProjectEmailAlerts) {
    setEmailAlerts(
      next.enabled && !next.newProblems && !next.checkFailures ? { ...next, enabled: false } : next
    )
  }

  /** Validate and persist site identity, monitoring, access, and email preferences. */
  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('Enter a display name for this website.')
      return
    }
    if (!nextOrigin) {
      setError('Use a secure website address beginning with https://.')
      return
    }
    if (pages.some(page => !page.trim())) {
      setError('Every page needs a path or full URL.')
      return
    }
    if (accessMode === 'protected' && effectiveAuthenticatedPages.length === 0) {
      setError('Select at least one page that requires sign-in, or choose public access.')
      return
    }
    setSaving(true)
    try {
      const response = await fetch(`/api/projects/${props.projectId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          authenticatedPages: effectiveAuthenticatedPages,
          checkNow: checkAfterSave,
          emailAlerts,
          name: name.trim(),
          pages,
          secureRunnerRequired,
          url
        })
      })
      const payload: unknown = await response.json()
      if (!response.ok || !isProjectConfigurationSaveResponse(payload))
        throw new Error(readProjectConfigurationError(payload))
      setOpen(false)
      toastForSavedSettings(payload, checkAfterSave)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The site settings could not be updated.')
    } finally {
      setSaving(false)
    }
  }

  return {
    accessMode,
    authenticatedPages: effectiveAuthenticatedPages,
    changeAccessMode,
    changeEmailAlerts,
    changeOpen,
    checkAfterSave,
    emailAlerts,
    error,
    hasChanges,
    monitoringChanged,
    name,
    open,
    originChanged,
    pages,
    removePage,
    replacePages,
    saveSettings,
    saving,
    secureRunnerRequired,
    setError,
    setName,
    setPages,
    setSecureRunnerRequired,
    setUrl,
    togglePageAccess,
    updatePage,
    url
  }
}

/** Reduce stored infrastructure-only access to the onboarding choice the user originally made. */
function getEditableAccessMode(
  storedMode: SiteAccessMode,
  authenticatedPages: string[],
  pages: string[]
): SiteAccessMode {
  if (authenticatedPages.length === 0) return 'public'
  return authenticatedPages.length === pages.length ? 'private' : storedMode
}

/** Derive the authenticated-page draft represented by the visible access choice. */
function getEffectiveAuthenticatedPages(
  accessMode: SiteAccessMode,
  authenticatedPages: string[],
  pages: string[]
): string[] {
  if (accessMode === 'public') return []
  if (accessMode === 'private') return pages.filter(page => page.trim())
  return authenticatedPages.filter(page => pages.includes(page))
}

/** Mirror the persisted site access mode without normalizing incomplete input fields. */
function getDerivedAccessMode(
  pages: string[],
  authenticatedPages: string[],
  secureRunnerRequired: boolean
): SiteAccessMode {
  if (!secureRunnerRequired && authenticatedPages.length === 0) return 'public'
  return authenticatedPages.length > 0 && authenticatedPages.length === pages.length
    ? 'private'
    : 'protected'
}

/** Confirm saved settings with the next operational outcome, not implementation details. */
function toastForSavedSettings(
  payload: {
    changed: boolean
    checkWarning?: string
    monitoringChanged: boolean
    queued: boolean
  },
  checkAfterSave: boolean
) {
  toast.success(payload.changed ? 'Site settings saved' : 'Settings already up to date', {
    description: payload.queued
      ? 'A fresh check has started with the updated website settings.'
      : (payload.checkWarning ??
        (payload.monitoringChanged && !checkAfterSave
          ? 'The settings are saved. Connect page access before starting a complete check.'
          : 'Your monitoring and email preferences are up to date.'))
  })
}
