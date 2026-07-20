export const STUDIO_MAX_ATTACHMENTS = 3
export const STUDIO_MAX_TOTAL_ATTACHMENT_BYTES = 8 * 1024 * 1024
export const STUDIO_ATTACHMENT_ACCEPT =
  '.avif,.csv,.docx,.gif,.jpeg,.jpg,.json,.md,.pdf,.png,.pptx,.txt,.webp,.xlsx'

const IMAGE_MAX_BYTES = 5 * 1024 * 1024
const DOCUMENT_MAX_BYTES = 1024 * 1024
const TEXT_MAX_BYTES = 150 * 1024

const attachmentKinds = {
  avif: { mimeType: 'image/avif', maximumBytes: IMAGE_MAX_BYTES },
  csv: { mimeType: 'text/csv', maximumBytes: TEXT_MAX_BYTES },
  docx: {
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    maximumBytes: DOCUMENT_MAX_BYTES
  },
  gif: { mimeType: 'image/gif', maximumBytes: IMAGE_MAX_BYTES },
  jpeg: { mimeType: 'image/jpeg', maximumBytes: IMAGE_MAX_BYTES },
  jpg: { mimeType: 'image/jpeg', maximumBytes: IMAGE_MAX_BYTES },
  json: { mimeType: 'application/json', maximumBytes: TEXT_MAX_BYTES },
  md: { mimeType: 'text/markdown', maximumBytes: TEXT_MAX_BYTES },
  pdf: { mimeType: 'application/pdf', maximumBytes: DOCUMENT_MAX_BYTES },
  png: { mimeType: 'image/png', maximumBytes: IMAGE_MAX_BYTES },
  pptx: {
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    maximumBytes: DOCUMENT_MAX_BYTES
  },
  txt: { mimeType: 'text/plain', maximumBytes: TEXT_MAX_BYTES },
  webp: { mimeType: 'image/webp', maximumBytes: IMAGE_MAX_BYTES },
  xlsx: {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    maximumBytes: DOCUMENT_MAX_BYTES
  }
} as const

export interface StudioAttachmentCandidate {
  name: string
  size: number
  type: string
}

export interface ValidStudioAttachment {
  extension: keyof typeof attachmentKinds
  mimeType: string
}

/** Validate one small visual or reference file before it enters private project storage. */
export function validateStudioAttachment(candidate: StudioAttachmentCandidate): {
  attachment?: ValidStudioAttachment
  error?: string
} {
  const extension = readExtension(candidate.name)
  if (!extension)
    return {
      error: 'Use an image, PDF, text file, document, presentation, or spreadsheet.'
    }
  const kind = attachmentKinds[extension]
  if (candidate.size <= 0) return { error: 'This file is empty.' }
  if (candidate.size > kind.maximumBytes)
    return {
      error: kind.mimeType.startsWith('image/')
        ? 'Images must be smaller than 5 MB.'
        : kind.mimeType.startsWith('text/') || kind.mimeType === 'application/json'
          ? 'Text files must be smaller than 150 KB.'
          : 'Documents must be smaller than 1 MB.'
    }
  if (!mimeTypeMatches(candidate.type, kind.mimeType))
    return { error: 'The file contents do not match its name.' }
  return { attachment: { extension, mimeType: kind.mimeType } }
}

/** Keep uploaded names readable while removing path and control characters. */
export function safeStudioAttachmentName(name: string): string {
  const lastSegment = name.split(/[\\/]/).at(-1) ?? ''
  const printable = [...lastSegment]
    .filter(character => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)
    .join('')
  return printable.trim().slice(0, 160) || 'reference-file'
}

/** Format a compact, non-technical size label for the composer. */
export function formatStudioAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Resolve a supported lowercase extension without a type assertion. */
function readExtension(name: string): keyof typeof attachmentKinds | undefined {
  const extension = name.split('.').at(-1)?.toLowerCase()
  if (
    extension === 'avif' ||
    extension === 'csv' ||
    extension === 'docx' ||
    extension === 'gif' ||
    extension === 'jpeg' ||
    extension === 'jpg' ||
    extension === 'json' ||
    extension === 'md' ||
    extension === 'pdf' ||
    extension === 'png' ||
    extension === 'pptx' ||
    extension === 'txt' ||
    extension === 'webp' ||
    extension === 'xlsx'
  )
    return extension
  return undefined
}

/** Accept canonical MIME types while tolerating ordinary browser fallbacks. */
function mimeTypeMatches(actual: string, expected: string): boolean {
  if (!actual || actual === 'application/octet-stream') return true
  if (actual === expected) return true
  return expected === 'text/markdown' && actual === 'text/plain'
}
