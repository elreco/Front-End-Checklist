'use client'

import type { DiscoveredPage } from '@coderocket/core'
import { Check, FileUp, LoaderCircle, Radar, Search } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import type { ChangeEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { getEnteredPages, getImportedPages, mergeEnteredPages } from '@/lib/onboarding-pages'

interface PageCandidate {
  path: string
  source: 'homepage' | 'import' | 'sitemap'
}

interface OnboardingPageDiscoveryProps {
  cloudDiscoveryBlocked: boolean
  pagesPerProject: number
  pagesValue: string
  siteUrl: string
  onPagesChange: (value: string) => void
}

/** Discover or import routes, then let the user explicitly choose what to monitor. */
export function OnboardingPageDiscovery({
  cloudDiscoveryBlocked,
  onPagesChange,
  pagesPerProject,
  pagesValue,
  siteUrl
}: OnboardingPageDiscoveryProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [candidates, setCandidates] = useState<PageCandidate[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')
  const [message, setMessage] = useState<string>()
  const currentPages = getEnteredPages(pagesValue)
  const remainingSlots = Math.max(0, pagesPerProject - currentPages.length)
  const validSiteUrl = isValidSiteUrl(siteUrl)

  useEffect(() => {
    setCandidates([])
    setSelected([])
    setMessage(undefined)
  }, [cloudDiscoveryBlocked, siteUrl])

  /** Ask the safe cloud fetcher for sitemap and homepage-link candidates. */
  async function discoverPages() {
    setStatus('loading')
    setMessage(undefined)
    try {
      const response = await fetch('/api/page-discovery', {
        body: JSON.stringify({ url: siteUrl }),
        headers: { 'content-type': 'application/json' },
        method: 'POST'
      })
      const body: unknown = await response.json()
      if (!response.ok) throw new Error(readError(body))
      const pages = readDiscoveredPages(body)
      showCandidates(
        pages.map(page => ({ path: page.path, source: page.source })),
        'No additional public pages were found. You can import a sitemap or enter paths manually.'
      )
    } catch (error) {
      setCandidates([])
      setSelected([])
      setMessage(error instanceof Error ? error.message : 'Page discovery could not be completed.')
    } finally {
      setStatus('idle')
    }
  }

  /** Read a route export locally so protected-site details do not need to be uploaded. */
  async function importPages(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    if (!validSiteUrl) {
      setMessage('Enter the HTTPS website address first so imported URLs stay on the right site.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage('Choose a sitemap or route list smaller than 2 MB.')
      return
    }
    const pages = getImportedPages(await file.text(), siteUrl).map(path => ({
      path,
      source: 'import' as const
    }))
    showCandidates(
      pages,
      'No usable same-site page paths were found in this file. Try XML, JSON, CSV, or one path per line.'
    )
  }

  /** Replace the review list with new paths that are not already being watched. */
  function showCandidates(nextCandidates: PageCandidate[], emptyMessage: string) {
    const unique = nextCandidates.filter(
      (candidate, index, pages) =>
        !currentPages.includes(candidate.path) &&
        pages.findIndex(page => page.path === candidate.path) === index
    )
    setCandidates(unique)
    setSelected(unique.slice(0, remainingSlots).map(candidate => candidate.path))
    setMessage(unique.length > 0 ? undefined : emptyMessage)
  }

  /** Add only the reviewed selection while preserving the user's current page order. */
  function addSelectedPages() {
    onPagesChange(mergeEnteredPages(pagesValue, selected))
    setCandidates([])
    setSelected([])
    setMessage(
      `${selected.length} ${selected.length === 1 ? 'page was' : 'pages were'} added. You can edit the list below.`
    )
  }

  /** Keep candidate selection inside the current plan capacity. */
  function toggleCandidate(path: string) {
    setSelected(current =>
      current.includes(path)
        ? current.filter(candidate => candidate !== path)
        : current.length < remainingSlots
          ? [...current, path]
          : current
    )
  }

  return (
    <section
      className="max-w-2xl border border-border bg-surface p-4"
      aria-labelledby="add-pages-faster"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-signal text-signal">
          <Radar aria-hidden className="h-4 w-4" />
        </span>
        <div>
          <h3 className="font-heading font-semibold" id="add-pages-faster">
            Add pages faster
          </h3>
          <p className="mt-1 text-muted text-xs leading-5">
            Find public pages from the sitemap and home page, or import a file from your project.
            Nothing is added until you review it.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <CodeRocketButton
          disabled={cloudDiscoveryBlocked || !validSiteUrl || status === 'loading'}
          onClick={discoverPages}
          size="sm"
          type="button"
          variant="outline"
        >
          {status === 'loading' ? (
            <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
          ) : (
            <Search aria-hidden />
          )}
          {status === 'loading' ? 'Looking for pages…' : 'Find public pages'}
        </CodeRocketButton>
        <CodeRocketButton
          disabled={!validSiteUrl}
          onClick={() => fileInput.current?.click()}
          size="sm"
          type="button"
          variant="outline"
        >
          <FileUp aria-hidden /> Import sitemap or routes
        </CodeRocketButton>
        <input
          accept=".xml,.txt,.csv,.json,application/xml,text/xml,text/plain,text/csv,application/json"
          hidden
          onChange={importPages}
          ref={fileInput}
          type="file"
        />
      </div>
      {!validSiteUrl ? (
        <p className="mt-3 text-muted text-xs">
          Enter a valid HTTPS address in the previous step first.
        </p>
      ) : cloudDiscoveryBlocked ? (
        <p className="mt-3 text-muted text-xs leading-5">
          The cloud cannot inspect this protected site. Importing a file happens in your browser and
          is the fastest safe option.
        </p>
      ) : null}
      {message ? (
        <p
          className="mt-3 border border-border bg-background px-3 py-2 text-muted text-xs leading-5"
          role="status"
        >
          {message}
        </p>
      ) : null}
      {candidates.length > 0 ? (
        <div className="mt-4 border border-border bg-background p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-sm">Choose pages to add</p>
              <p className="mt-1 text-muted text-xs">
                {candidates.length} found · {selected.length} selected · {remainingSlots} slots
                available
              </p>
            </div>
            <CodeRocketButton
              disabled={selected.length === 0}
              onClick={addSelectedPages}
              size="sm"
              type="button"
            >
              <Check aria-hidden /> Add selected
            </CodeRocketButton>
          </div>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
            {candidates.map(candidate => {
              const checked = selected.includes(candidate.path)
              const disabled = !checked && selected.length >= remainingSlots
              return (
                <label
                  className={`flex cursor-pointer items-center justify-between gap-3 border p-3 text-sm ${
                    checked ? 'border-signal bg-signal/10' : 'border-border bg-surface'
                  } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                  key={candidate.path}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <input
                      checked={checked}
                      className="h-4 w-4 shrink-0 accent-signal"
                      disabled={disabled}
                      onChange={() => toggleCandidate(candidate.path)}
                      type="checkbox"
                    />
                    <span className="truncate font-mono text-xs">{candidate.path}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-muted uppercase tracking-wider">
                    {candidate.source === 'homepage'
                      ? 'home link'
                      : candidate.source === 'sitemap'
                        ? 'sitemap'
                        : 'file'}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function isValidSiteUrl(value: string): boolean {
  try {
    return new URL(value.trim()).protocol === 'https:'
  } catch {
    return false
  }
}

function readError(value: unknown): string {
  if (value && typeof value === 'object' && 'error' in value && typeof value.error === 'string')
    return value.error
  return 'Page discovery could not be completed.'
}

function readDiscoveredPages(value: unknown): DiscoveredPage[] {
  if (!value || typeof value !== 'object' || !('pages' in value) || !Array.isArray(value.pages))
    return []
  return value.pages.filter(isDiscoveredPage)
}

function isDiscoveredPage(value: unknown): value is DiscoveredPage {
  if (!value || typeof value !== 'object') return false
  if (!('path' in value) || typeof value.path !== 'string') return false
  if (!('source' in value)) return false
  return value.source === 'homepage' || value.source === 'sitemap'
}
