'use client'

import type { SiteEditSelection } from '@coderocket/core/site-edit'
import { LoaderCircle, MousePointerClick, WandSparkles, X } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketTextarea } from '@repo/design-system/ui/coderocket-field'
import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { requestBuilderSiteEdit } from './actions'
import { useStudioSelection } from './studio-selection-context'

const suggestions = [
  'Make the first section feel more premium',
  'Add a section that explains our benefits',
  'Make the main action clearer'
]

/** Let a novice describe one outcome while showing its maximum credit cost before submission. */
export function StudioEditForm({ disabled, siteId }: { disabled: boolean; siteId: string }) {
  const [instruction, setInstruction] = useState('')
  const { clearSelection, selection, setSelecting } = useStudioSelection()
  const visibleSuggestions = selection ? selectionSuggestions(selection.kind) : suggestions

  return (
    <form action={requestBuilderSiteEdit} className="border-border border-t p-4">
      <input name="siteId" type="hidden" value={siteId} />
      <input name="selection" type="hidden" value={selection ? JSON.stringify(selection) : ''} />
      {selection ? (
        <div className="mb-4 border border-signal bg-surface-raised p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-mono text-signal text-xs uppercase tracking-[.12em]">
                <MousePointerClick aria-hidden className="h-4 w-4" /> Selected on the page
              </p>
              <p className="mt-2 truncate font-semibold text-sm">{selection.label}</p>
              <p className="mt-1 text-muted text-xs">
                CodeRocket will apply your request specifically to this{' '}
                {selectionNoun(selection.kind)}.
              </p>
            </div>
            <CodeRocketButton
              aria-label="Clear selected element"
              onClick={clearSelection}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X aria-hidden />
            </CodeRocketButton>
          </div>
        </div>
      ) : (
        <button
          className="mb-4 flex w-full items-center gap-2 border border-border border-dashed p-3 text-left text-muted text-sm hover:border-signal hover:bg-surface-raised hover:text-foreground"
          disabled={disabled}
          onClick={() => setSelecting(true)}
          type="button"
        >
          <MousePointerClick aria-hidden className="h-4 w-4 text-signal" />
          Select something in the preview for a more precise change
        </button>
      )}
      <label className="font-semibold text-sm" htmlFor="studio-instruction">
        {selection ? 'What should change here?' : 'What would you like to change?'}
      </label>
      <CodeRocketTextarea
        className="mt-2 min-h-28"
        disabled={disabled}
        id="studio-instruction"
        maxLength={2000}
        name="instruction"
        onChange={event => setInstruction(event.target.value)}
        placeholder={
          selection
            ? selectionPlaceholder(selection.kind)
            : 'For example: make the first section warmer and add three customer benefits.'
        }
        required
        value={instruction}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {visibleSuggestions.map(suggestion => (
          <button
            className="border border-border px-2.5 py-1.5 text-left text-muted text-xs hover:bg-surface-raised hover:text-foreground"
            disabled={disabled}
            key={suggestion}
            onClick={() => setInstruction(suggestion)}
            type="button"
          >
            {suggestion}
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-muted text-xs">Up to 6 credits · shown before every larger action</p>
        <SubmitChangeButton disabled={disabled || instruction.trim().length < 2} />
      </div>
    </form>
  )
}

function selectionNoun(kind: SiteEditSelection['kind']): string {
  if (kind === 'collection_item') return 'card'
  if (kind === 'brand') return 'brand name'
  return kind
}

function selectionPlaceholder(kind: SiteEditSelection['kind']): string {
  if (kind === 'button') return 'For example: change the wording to “Book a call”.'
  if (kind === 'image') return 'For example: replace it with a warmer team photograph.'
  if (kind === 'heading') return 'For example: make this title shorter and more direct.'
  if (kind === 'text') return 'For example: simplify this explanation for new customers.'
  if (kind === 'brand') return 'For example: change the displayed name to Northstar Creative.'
  if (kind === 'collection_item') return 'For example: update this card’s title and price.'
  return 'For example: make this section clearer and more premium.'
}

function selectionSuggestions(kind: SiteEditSelection['kind']): string[] {
  if (kind === 'button')
    return ['Change its wording', 'Make it easier to notice', 'Use a more direct action']
  if (kind === 'image')
    return ['Use a warmer image', 'Make the image feel more premium', 'Improve its description']
  if (kind === 'heading') return ['Make it shorter', 'Make it more convincing', 'Use simpler words']
  if (kind === 'collection_item')
    return ['Update this card', 'Make this offer clearer', 'Change its price and wording']
  return ['Make this clearer', 'Make this feel more premium', 'Simplify this element']
}

function SubmitChangeButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <CodeRocketButton disabled={disabled || pending} size="sm" type="submit">
      {pending ? (
        <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
      ) : (
        <WandSparkles aria-hidden />
      )}
      {pending ? 'Starting…' : 'Make this change'}
    </CodeRocketButton>
  )
}
