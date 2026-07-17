'use client'

import { AlertTriangle, Globe2, LoaderCircle, Pencil } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketInput } from '@repo/design-system/ui/coderocket-field'
import { toast } from '@repo/design-system/ui/coderocket-toast'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@repo/design-system/ui/dialog'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useId, useState } from 'react'
import {
  getProjectEditorSubmitLabel,
  isProjectConfigurationSaveResponse,
  type ProjectSiteEditorProps,
  readProjectConfigurationError,
  safeHttpsOrigin
} from '@/lib/project-site-editor'
import { ProjectPageFields } from './project-page-fields'

/** Edit a monitored website without discarding its saved history or integrations. */
export function ProjectSiteEditor({
  accessMode,
  checking = false,
  maxPages,
  pages: initialPages,
  plan,
  problemPaths = [],
  projectId,
  siteUrl,
  triggerLabel = 'Edit URLs',
  variant = 'outline'
}: ProjectSiteEditorProps) {
  const router = useRouter()
  const formId = useId()
  const fieldId = useId()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [url, setUrl] = useState(siteUrl)
  const [pages, setPages] = useState(initialPages)
  const [error, setError] = useState('')
  const currentOrigin = safeHttpsOrigin(siteUrl)
  const nextOrigin = safeHttpsOrigin(url)
  const originChanged = Boolean(nextOrigin && currentOrigin && nextOrigin !== currentOrigin)
  const checkAfterSave = accessMode !== 'private'

  /** Reset draft values whenever the dialog starts a new editing session. */
  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) return
    setUrl(siteUrl)
    setPages(initialPages)
    setError('')
  }

  /** Update one controlled page path without changing the order of the monitored pages. */
  function updatePage(index: number, value: string) {
    setPages(current => current.map((page, pageIndex) => (pageIndex === index ? value : page)))
    setError('')
  }

  /** Remove one page while preserving at least one monitored URL. */
  function removePage(index: number) {
    if (pages.length === 1) {
      setError('Keep at least one page to monitor.')
      return
    }
    setPages(current => current.filter((_, pageIndex) => pageIndex !== index))
  }

  /** Validate and persist the URL configuration, then refresh the project summary. */
  async function saveConfiguration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!nextOrigin) {
      setError('Use a secure website address beginning with https://.')
      return
    }
    if (pages.some(page => !page.trim())) {
      setError('Every page needs a path or full URL.')
      return
    }
    setSaving(true)
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url, pages, checkNow: checkAfterSave })
      })
      const payload: unknown = await response.json()
      if (!response.ok || !isProjectConfigurationSaveResponse(payload))
        throw new Error(readProjectConfigurationError(payload))
      setOpen(false)
      toast.success(payload.changed ? 'Monitored URLs updated' : 'URLs already up to date', {
        description: payload.queued
          ? 'A fresh check has started. This result will be the new comparison starting point.'
          : (payload.checkWarning ??
            (checkAfterSave
              ? 'The changes are saved. Start a fresh check when you are ready.'
              : 'The changes are saved. Run the next check from your CI environment.'))
      })
      router.refresh()
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'The monitored URLs could not be updated.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog onOpenChange={changeOpen} open={open}>
      <DialogTrigger asChild>
        <CodeRocketButton disabled={checking} size="sm" type="button" variant={variant}>
          <Pencil aria-hidden /> {checking ? 'Check in progress' : triggerLabel}
        </CodeRocketButton>
      </DialogTrigger>
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-none bg-surface p-0"
        showClose
      >
        <DialogHeader className="shrink-0 border-border border-b p-6 pr-14">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-signal bg-background text-signal">
              <Globe2 aria-hidden className="h-5 w-5" />
            </span>
            <div>
              <p className="font-mono text-[10px] text-signal uppercase tracking-[.14em]">
                Website settings
              </p>
              <DialogTitle className="mt-2 font-heading text-2xl">Edit monitored URLs</DialogTitle>
              <DialogDescription className="mt-2 max-w-xl leading-6">
                Correct the website address or choose different pages. Saved reports and check
                history will stay available.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-6"
          id={formId}
          onSubmit={saveConfiguration}
        >
          <label className="block font-semibold text-sm" htmlFor={`${fieldId}-url`}>
            Website address
            <CodeRocketInput
              autoComplete="url"
              id={`${fieldId}-url`}
              onChange={event => {
                setUrl(event.target.value)
                setError('')
              }}
              required
              type="url"
              value={url}
            />
            <span className="mt-2 block font-normal text-muted text-xs leading-5">
              Use the public HTTPS origin. Page-specific paths belong in the list below.
            </span>
          </label>

          {originChanged ? (
            <div className="border border-warning bg-background p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div>
                  <p className="font-semibold text-sm">This is a different website address</p>
                  <p className="mt-1 text-muted text-xs leading-5">
                    Existing history will remain visible, but the next completed check becomes a
                    fresh starting point. If this is an unrelated website, keep the histories
                    separate.
                  </p>
                  <Link
                    className="mt-2 inline-block font-mono text-signal text-xs hover:text-accent"
                    href="/onboarding"
                  >
                    Add it as a new site instead →
                  </Link>
                </div>
              </div>
            </div>
          ) : null}

          <ProjectPageFields
            fieldId={fieldId}
            initialPages={initialPages}
            maxPages={maxPages}
            onAdd={() => setPages(current => [...current, ''])}
            onRemove={removePage}
            onUpdate={updatePage}
            pages={pages}
            plan={plan}
            problemPaths={problemPaths}
          />

          {error ? (
            <p className="border border-danger bg-background p-3 text-danger text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <div className="border border-border bg-background p-4 text-muted text-xs leading-5">
            URL changes never rewrite old reports. The first complete result after saving becomes
            the reference for future comparisons.
          </div>
        </form>

        <DialogFooter className="shrink-0 border-border border-t bg-background p-4 sm:items-center sm:justify-between">
          <DialogClose asChild>
            <CodeRocketButton disabled={saving} size="sm" type="button" variant="ghost">
              Cancel
            </CodeRocketButton>
          </DialogClose>
          <CodeRocketButton disabled={saving} form={formId} size="sm" type="submit">
            {saving ? (
              <LoaderCircle aria-hidden className="animate-spin" />
            ) : (
              <Globe2 aria-hidden />
            )}
            {getProjectEditorSubmitLabel({ checkAfterSave, originChanged, saving })}
          </CodeRocketButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
