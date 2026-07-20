'use client'

import type { SiteDocument } from '@coderocket/core'
import type { SiteEditSelection } from '@coderocket/core/site-edit'
import { type KeyboardEvent, type MouseEvent, useEffect, useRef, useState } from 'react'
import { SiteDocumentPreview } from '@/components/site-document-preview'
import type { BuilderConnectionSummary } from '@/lib/builder-connections'
import {
  type PreviewViewport,
  type StudioPageOption,
  StudioPreviewToolbar
} from './studio-preview-toolbar'
import { useStudioSelection } from './studio-selection-context'

const previewWidths: Record<PreviewViewport, number | string> = {
  desktop: '100%',
  tablet: 768,
  mobile: 390
}

/** Let an owner review the recreated responsive layouts without exposing browser dimensions. */
export function StudioPreview({
  connections,
  document,
  readOnly = false,
  revisionId,
  selectedPath,
  siteId
}: {
  connections: BuilderConnectionSummary[]
  document: SiteDocument
  readOnly?: boolean
  revisionId?: string
  selectedPath: string
  siteId: string
}) {
  const [viewport, setViewport] = useState<PreviewViewport>('desktop')
  const pages: StudioPageOption[] =
    document.pages && document.pages.length > 0
      ? document.pages
      : [{ path: selectedPath, title: document.sections[0]?.heading || document.identity.name }]
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
    if (readOnly && selecting) setSelecting(false)
  }, [readOnly, selecting, setSelecting])

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

  /** Store a bounded semantic target from the visible preview. */
  function selectElement(element: HTMLElement) {
    const nextSelection = readPreviewSelection(element, pagePath)
    if (!nextSelection) return
    selectedElement.current?.removeAttribute('data-cr-selected')
    element.setAttribute('data-cr-selected', 'true')
    selectedElement.current = element
    select(nextSelection)
  }

  /** Select the closest eligible preview element without following its normal action. */
  function handlePreviewClick(event: MouseEvent<HTMLDivElement>) {
    if (readOnly || !selecting) return
    const target = closestSelectableTarget(event.target)
    if (!target || !event.currentTarget.contains(target)) return
    event.preventDefault()
    event.stopPropagation()
    selectElement(target)
  }

  /** Support selection and cancellation from the keyboard. */
  function handlePreviewKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (readOnly) return
    if (event.key === 'Escape' && selecting) {
      event.preventDefault()
      setSelecting(false)
      return
    }
    if (!selecting || (event.key !== 'Enter' && event.key !== ' ')) return
    const target = closestSelectableTarget(event.target)
    if (!target || !event.currentTarget.contains(target)) return
    event.preventDefault()
    selectElement(target)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <StudioPreviewToolbar
        clearSelection={clearSelection}
        pages={pages}
        revisionId={revisionId}
        selectedPath={selectedPath}
        selection={selection}
        selectionEnabled={!readOnly}
        selecting={selecting}
        setSelecting={setSelecting}
        setViewport={setViewport}
        siteId={siteId}
        viewport={viewport}
      />
      <div className="relative min-h-0 flex-1 overflow-auto bg-background-subtle p-1.5 sm:p-2">
        <div
          className="mx-auto min-h-full overflow-hidden border border-border bg-background transition-[width] duration-200 motion-reduce:transition-none data-[selecting=true]:[&_[data-cr-select-kind]:focus-visible]:outline-2 data-[selecting=true]:[&_[data-cr-select-kind]:focus-visible]:outline-signal data-[selecting=true]:[&_[data-cr-select-kind]:hover]:outline-2 data-[selecting=true]:[&_[data-cr-select-kind]:hover]:outline-signal [&_[data-cr-select-kind]]:outline-offset-[-3px] data-[selecting=true]:[&_[data-cr-select-kind]]:cursor-crosshair [&_[data-cr-selected=true]]:outline-2 [&_[data-cr-selected=true]]:outline-accent"
          data-preview-frame
          data-selecting={selecting}
          onClickCapture={handlePreviewClick}
          onKeyDownCapture={handlePreviewKeyDown}
          ref={previewFrame}
          style={{ maxWidth: '100%', width: previewWidths[viewport] }}
        >
          <SiteDocumentPreview
            connections={connections}
            document={document}
            pagePath={selectedPath}
          />
        </div>
      </div>
    </div>
  )
}

/** Convert trusted preview data attributes into the small AI selection context. */
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

/** Narrow arbitrary preview metadata to one supported selection kind. */
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

/** Find an eligible preview element from a browser event target without unsafe type coercion. */
function closestSelectableTarget(target: EventTarget | null): HTMLElement | undefined {
  if (!(target instanceof Element)) return undefined
  const selectable = target.closest('[data-cr-select-kind]')
  return selectable instanceof HTMLElement ? selectable : undefined
}
