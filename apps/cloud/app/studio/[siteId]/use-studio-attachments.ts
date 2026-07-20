'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  STUDIO_MAX_ATTACHMENTS,
  STUDIO_MAX_TOTAL_ATTACHMENT_BYTES,
  validateStudioAttachment
} from '@/lib/studio-attachments'

export interface ComposerAttachment {
  error?: string
  file: File
  id?: string
  localId: string
  previewUrl?: string
  status: 'uploading' | 'ready' | 'failed'
}

interface UploadResponse {
  attachment?: { id?: string }
  error?: string
}

/** Upload and remove small private prompt references while keeping their local visual state. */
export function useStudioAttachments(siteId: string) {
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([])
  const [error, setError] = useState('')
  const attachmentsRef = useRef<ComposerAttachment[]>([])
  const composerIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    attachmentsRef.current = attachments
  }, [attachments])
  useEffect(
    () => () => {
      for (const attachment of attachmentsRef.current)
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl)
    },
    []
  )

  const upload = useCallback(
    async (localId: string, file: File) => {
      const body = new FormData()
      body.set('file', file)
      composerIdRef.current ??= crypto.randomUUID()
      body.set('composerId', composerIdRef.current)
      try {
        const response = await fetch(`/api/studio/${encodeURIComponent(siteId)}/attachments`, {
          body,
          method: 'POST'
        })
        const result: UploadResponse = await response.json()
        if (!response.ok || !result.attachment?.id)
          throw new Error(result.error ?? 'The file could not be added.')
        setAttachments(current =>
          current.map(item =>
            item.localId === localId
              ? { ...item, id: result.attachment?.id, status: 'ready', error: undefined }
              : item
          )
        )
      } catch (uploadError) {
        setAttachments(current =>
          current.map(item =>
            item.localId === localId
              ? {
                  ...item,
                  error:
                    uploadError instanceof Error
                      ? uploadError.message
                      : 'The file could not be added.',
                  status: 'failed'
                }
              : item
          )
        )
      }
    },
    [siteId]
  )

  const addFiles = useCallback(
    (files: File[]) => {
      setError('')
      const available = STUDIO_MAX_ATTACHMENTS - attachmentsRef.current.length
      if (available <= 0) {
        setError('You can add up to three files.')
        return
      }
      const candidates = files.slice(0, available)
      const nextBytes = candidates.reduce((total, file) => total + file.size, 0)
      const currentBytes = attachmentsRef.current.reduce(
        (total, attachment) => total + attachment.file.size,
        0
      )
      if (currentBytes + nextBytes > STUDIO_MAX_TOTAL_ATTACHMENT_BYTES) {
        setError('Keep the three files under 8 MB in total.')
        return
      }
      const valid: ComposerAttachment[] = []
      for (const file of candidates) {
        const validation = validateStudioAttachment(file)
        if (!validation.attachment) {
          setError(validation.error ?? 'This file is not supported.')
          continue
        }
        valid.push({
          file,
          localId: crypto.randomUUID(),
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
          status: 'uploading'
        })
      }
      if (files.length > available) setError('Only the first three files were added.')
      if (valid.length === 0) return
      setAttachments(current => {
        const next = [...current, ...valid]
        attachmentsRef.current = next
        return next
      })
      for (const attachment of valid) upload(attachment.localId, attachment.file)
    },
    [upload]
  )

  const remove = useCallback(
    async (localId: string) => {
      const attachment = attachmentsRef.current.find(item => item.localId === localId)
      if (!attachment) return
      setAttachments(current => current.filter(item => item.localId !== localId))
      if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl)
      if (!attachment.id) return
      await fetch(
        `/api/studio/${encodeURIComponent(siteId)}/attachments?attachmentId=${encodeURIComponent(attachment.id)}`,
        { method: 'DELETE' }
      ).catch(() => undefined)
    },
    [siteId]
  )

  const retry = useCallback(
    (localId: string) => {
      const attachment = attachmentsRef.current.find(item => item.localId === localId)
      if (!attachment) return
      setAttachments(current =>
        current.map(item =>
          item.localId === localId ? { ...item, error: undefined, status: 'uploading' } : item
        )
      )
      upload(localId, attachment.file)
    },
    [upload]
  )

  return {
    addFiles,
    attachments,
    attachmentIds: attachments.flatMap(attachment =>
      attachment.status === 'ready' && attachment.id ? [attachment.id] : []
    ),
    error,
    hasUnreadyAttachments: attachments.some(attachment => attachment.status !== 'ready'),
    remove,
    retry
  }
}
