'use client'

import type { SiteEditSelection } from '@coderocket/core/site-edit'
import {
  LoaderCircle,
  MousePointerClick,
  Paperclip,
  WandSparkles,
  X
} from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketTextarea } from '@repo/design-system/ui/coderocket-field'
import { useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { STUDIO_ATTACHMENT_ACCEPT } from '@/lib/studio-attachments'
import { requestBuilderSiteEditWithContext } from './iteration-actions'
import { StudioComposerAttachments } from './studio-composer-attachments'
import { useStudioSelection } from './studio-selection-context'
import { StudioVoiceInput } from './studio-voice-input'
import { useStudioAttachments } from './use-studio-attachments'

const suggestions = [
  'Turn this website into a shop',
  'Add a product',
  'Create a pricing page',
  'Make the design feel more premium'
]

/** Let anyone request a visual change with words, files, voice, or a selected page element. */
export function StudioEditForm({ disabled, siteId }: { disabled: boolean; siteId: string }) {
  const [instruction, setInstruction] = useState('')
  const [dragging, setDragging] = useState(false)
  const [voiceBusy, setVoiceBusy] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const files = useStudioAttachments(siteId)
  const { clearSelection, selection, setSelecting } = useStudioSelection()
  const visibleSuggestions = selection ? selectionSuggestions(selection.kind) : suggestions
  const canSubmit =
    !disabled && instruction.trim().length >= 2 && !files.hasUnreadyAttachments && !voiceBusy

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = '0px'
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 64), 160)}px`
  }, [instruction])

  /** Append dictated wording without replacing a request the owner already typed. */
  function appendTranscript(text: string) {
    setInstruction(current =>
      `${current.trim()}${current.trim() ? ' ' : ''}${text}`.slice(0, 2_000)
    )
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  return (
    <form
      action={requestBuilderSiteEditWithContext}
      className="shrink-0 border-border border-t bg-surface p-2.5"
      onDragEnter={event => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={event => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          setDragging(false)
      }}
      onDragOver={event => event.preventDefault()}
      onDrop={event => {
        event.preventDefault()
        setDragging(false)
        if (!disabled) files.addFiles([...event.dataTransfer.files])
      }}
      ref={formRef}
    >
      <input name="siteId" type="hidden" value={siteId} />
      <input name="selection" type="hidden" value={selection ? JSON.stringify(selection) : ''} />
      <input name="attachmentIds" type="hidden" value={JSON.stringify(files.attachmentIds)} />
      <input
        accept={STUDIO_ATTACHMENT_ACCEPT}
        className="sr-only"
        disabled={disabled}
        multiple
        onChange={event => {
          files.addFiles([...(event.target.files ?? [])])
          event.target.value = ''
        }}
        ref={fileInputRef}
        type="file"
      />

      <div className="mb-1.5 flex gap-1.5 overflow-x-auto pb-0.5">
        {visibleSuggestions.map(suggestion => (
          <button
            className="shrink-0 border border-border bg-background px-2 py-1 text-left text-[11px] text-muted transition-colors hover:border-signal hover:text-foreground"
            disabled={disabled}
            key={suggestion}
            onClick={() => {
              setInstruction(suggestion)
              textareaRef.current?.focus()
            }}
            type="button"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div
        className={`border bg-background transition-[border-color,box-shadow] focus-within:border-signal focus-within:shadow-[0_0_0_1px_var(--signal)] ${
          dragging ? 'border-signal shadow-[0_0_0_1px_var(--signal)]' : 'border-border'
        }`}
      >
        {selection ? (
          <div className="mx-2.5 mt-2.5 flex items-center gap-2 border border-signal bg-surface-raised px-2 py-1.5">
            <MousePointerClick aria-hidden className="h-3.5 w-3.5 shrink-0 text-signal" />
            <span className="min-w-0 flex-1 truncate text-[11px]">
              Change this {selectionNoun(selection.kind)}: <strong>{selection.label}</strong>
            </span>
            <button
              aria-label="Clear selected element"
              className="grid h-6 w-6 shrink-0 place-items-center text-muted hover:bg-background hover:text-foreground"
              onClick={clearSelection}
              type="button"
            >
              <X aria-hidden className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        <StudioComposerAttachments
          attachments={files.attachments}
          onRemove={files.remove}
          onRetry={files.retry}
        />

        <label className="sr-only" htmlFor="studio-instruction">
          {selection ? 'What should change here?' : 'What would you like to change?'}
        </label>
        <CodeRocketTextarea
          aria-describedby="studio-composer-help studio-composer-error"
          className="mt-0 min-h-16 resize-none border-0 bg-transparent px-2.5 py-2.5 text-sm leading-5 focus:border-transparent"
          disabled={disabled}
          id="studio-instruction"
          maxLength={2000}
          name="instruction"
          onChange={event => setInstruction(event.target.value)}
          onKeyDown={event => {
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing &&
              canSubmit
            ) {
              event.preventDefault()
              formRef.current?.requestSubmit()
            }
          }}
          onPaste={event => {
            const pastedFiles = [...event.clipboardData.files]
            if (pastedFiles.length === 0) return
            event.preventDefault()
            files.addFiles(pastedFiles)
          }}
          placeholder={
            selection
              ? selectionPlaceholder(selection.kind)
              : 'Describe the result you want, or add a screenshot…'
          }
          ref={textareaRef}
          required
          value={instruction}
        />

        <div className="flex min-h-10 items-center justify-between gap-2 border-border border-t px-1.5 py-1">
          <div className="flex min-w-0 items-center">
            <button
              aria-label="Add images or reference files"
              className="grid h-8 w-8 shrink-0 place-items-center border border-transparent text-muted transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled || files.attachments.length >= 3}
              onClick={() => fileInputRef.current?.click()}
              title="Add files"
              type="button"
            >
              <Paperclip aria-hidden className="h-4 w-4" />
            </button>
            <StudioVoiceInput
              disabled={disabled}
              onBusyChange={setVoiceBusy}
              onTranscript={appendTranscript}
              siteId={siteId}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {instruction.length >= 1_600 ? (
              <span className="font-mono text-[10px] text-muted">{instruction.length}/2000</span>
            ) : null}
            <SubmitChangeButton disabled={!canSubmit} />
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <button
          className="flex min-w-0 items-center gap-1.5 truncate text-left text-[11px] text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          onClick={() => setSelecting(true)}
          type="button"
        >
          <MousePointerClick aria-hidden className="h-3.5 w-3.5 shrink-0 text-signal" />
          {selection ? 'Choose something else' : 'Target something in the preview'}
        </button>
        <p className="shrink-0 font-mono text-[10px] text-muted">6 credits · new version</p>
      </div>
      <p className="sr-only" id="studio-composer-help">
        Press Enter to build and Shift plus Enter for a new line. Files stay private. Voice audio is
        transcribed and not saved.
      </p>
      <p aria-live="polite" className="mt-2 text-danger text-xs" id="studio-composer-error">
        {files.error}
      </p>
    </form>
  )
}

/** Describe the selected preview target without exposing document implementation terms. */
function selectionNoun(kind: SiteEditSelection['kind']): string {
  if (kind === 'collection_item') return 'card'
  if (kind === 'brand') return 'brand name'
  return kind
}

/** Offer one concrete example tailored to the visible thing the owner selected. */
function selectionPlaceholder(kind: SiteEditSelection['kind']): string {
  if (kind === 'button') return 'For example: change the wording to “Book a call”.'
  if (kind === 'image') return 'For example: use the attached image here.'
  if (kind === 'heading') return 'For example: make this title shorter and more direct.'
  if (kind === 'text') return 'For example: simplify this explanation for new customers.'
  if (kind === 'brand') return 'For example: change the displayed name to Northstar Creative.'
  if (kind === 'collection_item') return 'For example: update this card’s title and price.'
  return 'For example: make this section clearer and more premium.'
}

/** Keep quick actions relevant to the selected page element. */
function selectionSuggestions(kind: SiteEditSelection['kind']): string[] {
  if (kind === 'button')
    return ['Change its wording', 'Make it easier to notice', 'Use a more direct action']
  if (kind === 'image')
    return ['Use my attached image', 'Make the image feel more premium', 'Improve its description']
  if (kind === 'heading') return ['Make it shorter', 'Make it more convincing', 'Use simpler words']
  if (kind === 'collection_item')
    return ['Update this card', 'Make this offer clearer', 'Change its price and wording']
  return ['Make this clearer', 'Make this feel more premium', 'Simplify this element']
}

/** Reflect server submission state without allowing duplicate edit jobs. */
function SubmitChangeButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <CodeRocketButton
      aria-label={pending ? 'Starting your change' : 'Build this change'}
      className="h-8 px-2.5 text-[11px]"
      disabled={disabled || pending}
      size="sm"
      type="submit"
    >
      {pending ? (
        <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
      ) : (
        <WandSparkles aria-hidden />
      )}
      <span>{pending ? 'Starting…' : 'Build it'}</span>
    </CodeRocketButton>
  )
}
