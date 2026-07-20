'use client'

import { FigmaBrandIcon } from '@repo/design-system/brand-icons'
import { Check, ExternalLink, Image, LoaderCircle, TriangleAlert } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketInput } from '@repo/design-system/ui/coderocket-field'
import { useState } from 'react'
import { z } from 'zod'

const screenSchema = z.object({
  height: z.number().positive(),
  id: z.string().min(1).max(160),
  name: z.string().min(1).max(120),
  pageName: z.string().min(1).max(120).optional(),
  thumbnailUrl: z.string().url().optional(),
  width: z.number().positive()
})
const inspectionSchema = z.object({
  fileName: z.string().min(1).max(120),
  screens: z.array(screenSchema).max(50),
  sourceUrl: z.string().url(),
  truncated: z.boolean()
})
const errorSchema = z.object({
  code: z.string().optional(),
  connectUrl: z.string().optional(),
  error: z.string()
})

type FigmaScreen = z.infer<typeof screenSchema>

/** Inspect one connected Figma file and submit only the owner's explicit screen selection. */
export function FigmaSourcePicker({
  initialUrl,
  onFileName,
  onReadyChange
}: {
  initialUrl: string
  onFileName: (name: string) => void
  onReadyChange: (ready: boolean) => void
}) {
  const [figmaUrl, setFigmaUrl] = useState(initialUrl)
  const [fileName, setFileName] = useState('')
  const [screens, setScreens] = useState<FigmaScreen[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [connectUrl, setConnectUrl] = useState('')
  const [truncated, setTruncated] = useState(false)

  const inspectDesign = async () => {
    if (!figmaUrl.trim() || loading) return
    setLoading(true)
    setError('')
    setConnectUrl('')
    onReadyChange(false)
    try {
      const response = await fetch('/api/create/figma/inspect', {
        body: JSON.stringify({ url: figmaUrl }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST'
      })
      const payload: unknown = await response.json()
      if (!response.ok) {
        const parsedError = errorSchema.safeParse(payload)
        setError(
          parsedError.success
            ? parsedError.data.error
            : 'Figma could not inspect this design. Check the link and try again.'
        )
        setConnectUrl(parsedError.success ? (parsedError.data.connectUrl ?? '') : '')
        return
      }
      const parsed = inspectionSchema.safeParse(payload)
      if (!parsed.success) throw new Error('Figma returned an incomplete screen list')
      const preferred = findPreferredScreen(parsed.data.screens, parsed.data.sourceUrl)
      const initialSelection = preferred ? [preferred.id] : []
      setFigmaUrl(parsed.data.sourceUrl)
      setFileName(parsed.data.fileName)
      setScreens(parsed.data.screens)
      setSelected(initialSelection)
      setTruncated(parsed.data.truncated)
      onFileName(parsed.data.fileName)
      onReadyChange(initialSelection.length > 0)
      if (parsed.data.screens.length === 0)
        setError(
          'No page-sized frames were found. Add a frame in Figma, then inspect the file again.'
        )
    } catch (inspectionError) {
      setError(
        inspectionError instanceof Error
          ? inspectionError.message
          : 'Figma could not inspect this design. Check the link and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const changeSelection = (screenId: string, checked: boolean) => {
    const next = checked
      ? selected.includes(screenId)
        ? selected
        : [...selected, screenId]
      : selected.filter(id => id !== screenId)
    if (next.length > 5) {
      setError('Choose up to five screens for one first version.')
      return
    }
    setSelected(next)
    setError(next.length === 0 ? 'Choose at least one screen.' : '')
    onReadyChange(next.length > 0)
  }

  const changeUrl = (value: string) => {
    setFigmaUrl(value)
    setFileName('')
    setScreens([])
    setSelected([])
    setError('')
    setConnectUrl('')
    onReadyChange(false)
  }

  return (
    <div className="mt-6 max-w-3xl">
      <label className="block font-semibold text-sm" htmlFor="builder-figma-url">
        Paste the Figma design link
      </label>
      <p className="mt-1 text-muted text-sm leading-6" id="figma-link-help">
        Use a link to the file or a specific frame. CodeRocket reads only designs your connected
        Figma account can open.
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <CodeRocketInput
          aria-describedby="figma-link-help figma-inspection-status"
          aria-invalid={error ? true : undefined}
          autoComplete="url"
          className="mt-0 min-w-0 flex-1"
          id="builder-figma-url"
          name="figmaUrl"
          onChange={event => changeUrl(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void inspectDesign()
            }
          }}
          placeholder="https://www.figma.com/design/…"
          required
          type="url"
          value={figmaUrl}
        />
        <CodeRocketButton
          aria-disabled={loading || !figmaUrl.trim()}
          disabled={loading || !figmaUrl.trim()}
          onClick={() => void inspectDesign()}
          type="button"
          variant="outline"
        >
          {loading ? (
            <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
          ) : (
            <FigmaBrandIcon aria-hidden className="h-4 w-4" />
          )}
          {loading
            ? 'Reading the design…'
            : screens.length > 0
              ? 'Refresh screens'
              : 'Show screens'}
        </CodeRocketButton>
      </div>

      <div aria-live="polite" className="mt-3" id="figma-inspection-status">
        {error ? (
          <div className="flex flex-col gap-3 border border-danger bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex gap-2 text-danger text-sm leading-6" role="alert">
              <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
            {connectUrl ? (
              <CodeRocketButton asChild className="shrink-0" variant="outline">
                <a href={connectUrl}>
                  <FigmaBrandIcon aria-hidden className="h-4 w-4" />
                  Connect Figma
                  <ExternalLink aria-hidden />
                </a>
              </CodeRocketButton>
            ) : null}
          </div>
        ) : screens.length > 0 ? (
          <p className="flex items-center gap-2 text-sm text-success">
            <Check aria-hidden className="h-4 w-4" />
            {fileName} is ready. Choose the screens for this website.
          </p>
        ) : (
          <p className="text-muted text-xs">
            Your Figma password and editing rights are never requested.
          </p>
        )}
      </div>

      {screens.length > 0 ? (
        <fieldset className="mt-5 min-w-0 border-0 p-0">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <legend className="font-heading font-semibold text-lg">Choose 1 to 5 screens</legend>
            <span className="font-mono text-muted text-xs">{selected.length} selected</span>
          </div>
          <p className="mt-1 text-muted text-sm">
            The first selected screen becomes the homepage. Each other screen becomes a page.
          </p>
          <div className="mt-3 grid max-h-[36rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
            {screens.map(screen => {
              const checked = selected.includes(screen.id)
              return (
                <label
                  className="relative cursor-pointer overflow-hidden border border-border bg-background has-[:checked]:border-signal has-[:checked]:bg-surface-raised has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-signal"
                  key={screen.id}
                >
                  <input
                    checked={checked}
                    className="peer sr-only"
                    name="figmaScreenChoice"
                    onChange={event => changeSelection(screen.id, event.target.checked)}
                    type="checkbox"
                    value={screen.id}
                  />
                  <span className="relative block aspect-[16/10] overflow-hidden bg-surface-raised">
                    {screen.thumbnailUrl ? (
                      <img
                        alt=""
                        aria-hidden
                        className="h-full w-full object-contain"
                        decoding="async"
                        loading="lazy"
                        src={screen.thumbnailUrl}
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center">
                        <Image aria-hidden className="h-6 w-6 text-muted" />
                      </span>
                    )}
                    <span
                      className={`absolute top-2 right-2 flex h-6 w-6 items-center justify-center border ${
                        checked
                          ? 'border-signal bg-signal text-signal-foreground'
                          : 'border-border bg-background'
                      }`}
                    >
                      {checked ? <Check aria-hidden className="h-4 w-4" /> : null}
                    </span>
                  </span>
                  <span className="block border-border border-t p-3">
                    <span className="block truncate font-semibold text-sm">{screen.name}</span>
                    <span className="mt-1 block truncate text-muted text-xs">
                      {screen.pageName ? `${screen.pageName} · ` : ''}
                      {Math.round(screen.width)} × {Math.round(screen.height)}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
          {truncated ? (
            <p className="mt-3 text-muted text-xs">
              This file contains more than 50 page-sized frames. Move the screens you need to the
              start of a Figma page, then refresh this list.
            </p>
          ) : null}
          <input name="figmaFileName" type="hidden" value={fileName} />
          {selected.map(id => {
            const screen = screens.find(candidate => candidate.id === id)
            return screen ? (
              <span key={id}>
                <input name="figmaNodeId" type="hidden" value={screen.id} />
                <input name="figmaNodeName" type="hidden" value={screen.name} />
                <input name="figmaPageName" type="hidden" value={screen.pageName ?? ''} />
              </span>
            ) : null
          })}
        </fieldset>
      ) : null}
    </div>
  )
}

function findPreferredScreen(screens: FigmaScreen[], sourceUrl: string): FigmaScreen | undefined {
  const requestedNode = new URL(sourceUrl).searchParams.get('node-id')?.replaceAll('-', ':')
  return screens.find(screen => screen.id === requestedNode) ?? screens[0]
}
