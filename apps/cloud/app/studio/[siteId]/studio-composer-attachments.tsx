'use client'

import { FileText, Image, LoaderCircle, RotateCcw, X } from '@repo/design-system/icons'
import { formatStudioAttachmentSize } from '@/lib/studio-attachments'
import type { ComposerAttachment } from './use-studio-attachments'

/** Show exactly what the assistant will receive, with clear upload and recovery states. */
export function StudioComposerAttachments({
  attachments,
  onRemove,
  onRetry
}: {
  attachments: ComposerAttachment[]
  onRemove: (localId: string) => void
  onRetry: (localId: string) => void
}) {
  if (attachments.length === 0) return null
  return (
    <div className="flex gap-2 overflow-x-auto px-3 pt-3">
      {attachments.map(attachment => (
        <article
          className="relative flex min-w-44 max-w-56 items-center gap-2 border border-border bg-surface-raised p-2"
          key={attachment.localId}
        >
          <AttachmentPreview attachment={attachment} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-xs">{attachment.file.name}</p>
            <p className="mt-0.5 text-[11px] text-muted">
              {attachment.status === 'uploading'
                ? 'Adding…'
                : attachment.status === 'failed'
                  ? 'Could not add'
                  : formatStudioAttachmentSize(attachment.file.size)}
            </p>
          </div>
          {attachment.status === 'failed' ? (
            <button
              aria-label={`Try adding ${attachment.file.name} again`}
              className="grid h-7 w-7 shrink-0 place-items-center text-danger hover:bg-background"
              onClick={() => onRetry(attachment.localId)}
              title="Try again"
              type="button"
            >
              <RotateCcw aria-hidden className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <button
            aria-label={`Remove ${attachment.file.name}`}
            className="grid h-7 w-7 shrink-0 place-items-center text-muted hover:bg-background hover:text-foreground"
            onClick={() => onRemove(attachment.localId)}
            title="Remove file"
            type="button"
          >
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        </article>
      ))}
    </div>
  )
}

/** Use a local thumbnail when available and a stable file icon for other references. */
function AttachmentPreview({ attachment }: { attachment: ComposerAttachment }) {
  if (attachment.status === 'uploading')
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center bg-background text-signal">
        <LoaderCircle aria-hidden className="h-4 w-4 animate-spin motion-reduce:animate-none" />
      </span>
    )
  if (attachment.previewUrl)
    return (
      <img
        alt=""
        className="h-9 w-9 shrink-0 object-cover"
        height={36}
        src={attachment.previewUrl}
        width={36}
      />
    )
  const Icon = attachment.file.type.startsWith('image/') ? Image : FileText
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center bg-background text-muted">
      <Icon aria-hidden className="h-4 w-4" />
    </span>
  )
}
