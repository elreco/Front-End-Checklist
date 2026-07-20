'use client'

import type { SiteDocument } from '@coderocket/core'
import type { SiteEditSelection } from '@coderocket/core/site-edit'
import { Monitor, MousePointerClick, Smartphone, Tablet, X } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { type KeyboardEvent, type MouseEvent, useEffect, useRef, useState } from 'react'
import { SiteDocumentPreview } from '@/components/site-document-preview'
import { useStudioSelection } from './studio-selection-context'

type PreviewViewport = 'desktop' | 'tablet' | 'mobile'

const previewWidths: Record<PreviewViewport, number | string> = {
  desktop: '100%',
  tablet: 768,
  mobile: 390
}

/** Let an owner review the recreated responsive layouts without exposing browser dimensions. */
export function StudioPreview({ document }: { document: SiteDocument }) {
  const [viewport, setViewport] = useState<PreviewViewport>('desktop')
  const { clearSelection, pagePath, selecting, selection, select, setSelecting } =
    useStudioSelection()
  const previewFrame = useRef<HTMLDivElement>(null)
  const selectedElement = useRef<HTMLElement | undefined>(undefined)

  useEffect(() => {
    if (selection) return
    selectedElement.current?.removeAttribute('data-cr-selected')
    selectedElement.current = undefined
  }, [selection])

  useEffect(() => {
    if (!selecting) return
    const elements = Array.from(
      previewFrame.current?.querySelectorAll<HTMLElement>('[data-cr-select-kind]') ?? []
    )
    const previousTabIndexes = elements.map(element => element.getAttribute('tabindex'))
    elements.forEach(element => element.setAttribute('tabindex', '0'))
    return () => {
      elements.forEach((element, index) => {
        const previous = previousTabIndexes[index]
        if (previous === null) element.removeAttribute('tabindex')
        else element.setAttribute('tabindex', previous)
      })
    }
  }, [selecting])

  function selectElement(element: HTMLElement) {
    const nextSelection = readPreviewSelection(element, pagePath)
    if (!nextSelection) return
    selectedElement.current?.removeAttribute('data-cr-selected')
    element.setAttribute('data-cr-selected', 'true')
    selectedElement.current = element
    select(nextSelection)
  }

  function handlePreviewClick(event: MouseEvent<HTMLDivElement>) {
    if (!selecting) return
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-cr-select-kind]')
    if (!target || !event.currentTarget.contains(target)) return
    event.preventDefault()
    event.stopPropagation()
    selectElement(target)
  }

  function handlePreviewKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && selecting) {
      event.preventDefault()
      setSelecting(false)
      return
    }
    if (!selecting || (event.key !== 'Enter' && event.key !== ' ')) return
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-cr-select-kind]')
    if (!target || !event.currentTarget.contains(target)) return
    event.preventDefault()
    selectElement(target)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        aria-label="Preview size"
        className="hidden min-h-11 shrink-0 flex-wrap items-center gap-1 border-border border-b bg-background px-3 sm:flex"
        role="group"
      >
        <CodeRocketButton
          aria-pressed={viewport === 'desktop'}
          onClick={() => setViewport('desktop')}
          size="sm"
          type="button"
          variant={viewport === 'desktop' ? 'primary' : 'outline'}
        >
          <Monitor aria-hidden /> Desktop
        </CodeRocketButton>
        <CodeRocketButton
          aria-pressed={viewport === 'tablet'}
          onClick={() => setViewport('tablet')}
          size="sm"
          type="button"
          variant={viewport === 'tablet' ? 'primary' : 'outline'}
        >
          <Tablet aria-hidden /> Tablet
        </CodeRocketButton>
        <CodeRocketButton
          aria-pressed={viewport === 'mobile'}
          onClick={() => setViewport('mobile')}
          size="sm"
          type="button"
          variant={viewport === 'mobile' ? 'primary' : 'outline'}
        >
          <Smartphone aria-hidden /> Phone
        </CodeRocketButton>
      </div>
      <div className="flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-2 border-border border-b bg-surface-raised px-3 py-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-xs">
            {selecting
              ? 'Click the element you want to change'
              : selection
                ? `${selectionLabel(selection.kind)} selected`
                : 'Select an element for a precise prompt'}
          </p>
          <p className="mt-0.5 hidden truncate text-muted text-xs md:block">
            {selecting
              ? 'Buttons, text, images, and whole sections can be selected.'
              : selection
                ? `“${selection.label}” is now attached to your next request.`
                : 'CodeRocket will attach it to your next request.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selection ? (
            <CodeRocketButton onClick={clearSelection} size="sm" type="button" variant="ghost">
              <X aria-hidden /> Clear
            </CodeRocketButton>
          ) : null}
          <CodeRocketButton
            aria-pressed={selecting}
            onClick={() => setSelecting(!selecting)}
            size="sm"
            type="button"
            variant={selecting ? 'primary' : 'outline'}
          >
            <MousePointerClick aria-hidden />
            {selecting ? 'Cancel selection' : selection ? 'Select another' : 'Select on page'}
          </CodeRocketButton>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-background-subtle p-2 sm:p-3">
        <div
          className="mx-auto min-h-full overflow-hidden border border-border bg-background transition-[width] duration-200 motion-reduce:transition-none data-[selecting=true]:[&_[data-cr-select-kind]:focus-visible]:outline-2 data-[selecting=true]:[&_[data-cr-select-kind]:focus-visible]:outline-signal data-[selecting=true]:[&_[data-cr-select-kind]:hover]:outline-2 data-[selecting=true]:[&_[data-cr-select-kind]:hover]:outline-signal [&_[data-cr-select-kind]]:outline-offset-[-3px] data-[selecting=true]:[&_[data-cr-select-kind]]:cursor-crosshair [&_[data-cr-selected=true]]:outline-2 [&_[data-cr-selected=true]]:outline-accent"
          data-preview-frame
          data-selecting={selecting}
          onClickCapture={handlePreviewClick}
          onKeyDownCapture={handlePreviewKeyDown}
          ref={previewFrame}
          style={{ maxWidth: '100%', width: previewWidths[viewport] }}
        >
          <SiteDocumentPreview document={document} />
        </div>
      </div>
    </div>
  )
}

function readPreviewSelection(
  element: HTMLElement,
  pagePath: string
): SiteEditSelection | undefined {
  const kind = element.dataset.crSelectKind
  if (!isSelectionKind(kind)) return undefined
  const label = element.dataset.crSelectLabel?.trim().slice(0, 240)
  if (!label) return undefined
  return {
    kind,
    label,
    pagePath,
    ...(element.dataset.crSelectSection ? { sectionId: element.dataset.crSelectSection } : {}),
    ...(element.dataset.crSelectItem ? { itemId: element.dataset.crSelectItem } : {})
  }
}

function isSelectionKind(value?: string): value is SiteEditSelection['kind'] {
  return (
    value === 'brand' ||
    value === 'section' ||
    value === 'heading' ||
    value === 'text' ||
    value === 'button' ||
    value === 'image' ||
    value === 'collection_item'
  )
}

function selectionLabel(kind: SiteEditSelection['kind']): string {
  if (kind === 'brand') return 'Brand name'
  if (kind === 'collection_item') return 'Card'
  return kind.charAt(0).toUpperCase() + kind.slice(1)
}
