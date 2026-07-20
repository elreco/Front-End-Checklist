import { randomUUID } from 'node:crypto'
import { createServiceClient } from '@coderocket/db'
import {
  STUDIO_MAX_ATTACHMENTS,
  STUDIO_MAX_TOTAL_ATTACHMENT_BYTES,
  safeStudioAttachmentName,
  validateStudioAttachment
} from '@/lib/studio-attachments'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ATTACHMENT_BUCKET = 'cr-builder-prompt-files'

/** Store one owner-approved iteration reference privately before the prompt is submitted. */
export async function POST(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params
  const ownerId = await getOwnerId(siteId)
  if (!ownerId) return Response.json({ error: 'Website not found' }, { status: 404 })

  const formData = await request.formData().catch(() => undefined)
  const candidate = formData?.get('file')
  if (!(candidate instanceof File))
    return Response.json({ error: 'Choose a file to continue.' }, { status: 400 })

  const fileName = safeStudioAttachmentName(candidate.name)
  const composerId = String(formData?.get('composerId') ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(composerId))
    return Response.json({ error: 'Refresh this page and try again.' }, { status: 400 })
  const validation = validateStudioAttachment({
    name: fileName,
    size: candidate.size,
    type: candidate.type
  })
  if (!validation.attachment)
    return Response.json(
      { error: validation.error ?? 'This file is not supported.' },
      { status: 400 }
    )

  const db = createServiceClient()
  const { data: abandoned } = await db
    .from('cr_builder_message_attachments')
    .select('id,storage_path')
    .eq('owner_id', ownerId)
    .eq('site_id', siteId)
    .eq('status', 'pending')
    .neq('composer_id', composerId)
  if (abandoned && abandoned.length > 0) {
    await db.storage
      .from(ATTACHMENT_BUCKET)
      .remove(abandoned.map(attachment => attachment.storage_path))
    await db
      .from('cr_builder_message_attachments')
      .delete()
      .in(
        'id',
        abandoned.map(attachment => attachment.id)
      )
  }
  const { data: current } = await db
    .from('cr_builder_message_attachments')
    .select('id,byte_size')
    .eq('owner_id', ownerId)
    .eq('site_id', siteId)
    .eq('status', 'pending')
    .eq('composer_id', composerId)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  const currentBytes = (current ?? []).reduce((total, item) => total + item.byte_size, 0)
  if ((current?.length ?? 0) >= STUDIO_MAX_ATTACHMENTS)
    return Response.json({ error: 'You can add up to three files.' }, { status: 409 })
  if (currentBytes + candidate.size > STUDIO_MAX_TOTAL_ATTACHMENT_BYTES)
    return Response.json({ error: 'Keep the three files under 8 MB in total.' }, { status: 413 })

  const id = randomUUID()
  const storagePath = `${ownerId}/${siteId}/${id}.${validation.attachment.extension}`
  const bytes = new Uint8Array(await candidate.arrayBuffer())
  const { error: uploadError } = await db.storage
    .from(ATTACHMENT_BUCKET)
    .upload(storagePath, bytes, {
      contentType: validation.attachment.mimeType,
      upsert: false
    })
  if (uploadError)
    return Response.json({ error: 'The file could not be added. Try again.' }, { status: 503 })

  const { error: insertError } = await db.from('cr_builder_message_attachments').insert({
    id,
    owner_id: ownerId,
    site_id: siteId,
    composer_id: composerId,
    storage_path: storagePath,
    file_name: fileName,
    mime_type: validation.attachment.mimeType,
    byte_size: candidate.size,
    status: 'pending'
  })
  if (insertError) {
    await db.storage.from(ATTACHMENT_BUCKET).remove([storagePath])
    return Response.json({ error: 'The file could not be added. Try again.' }, { status: 503 })
  }

  return Response.json(
    {
      attachment: {
        id,
        name: fileName,
        size: candidate.size,
        type: validation.attachment.mimeType
      }
    },
    { headers: { 'Cache-Control': 'private, no-store' }, status: 201 }
  )
}

/** Remove only a still-pending file from both private storage and its owner-scoped record. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params
  const ownerId = await getOwnerId(siteId)
  if (!ownerId) return Response.json({ error: 'Website not found' }, { status: 404 })
  const attachmentId = new URL(request.url).searchParams.get('attachmentId') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(attachmentId))
    return Response.json({ error: 'File not found' }, { status: 404 })

  const db = createServiceClient()
  const { data: attachment } = await db
    .from('cr_builder_message_attachments')
    .select('id,storage_path')
    .eq('id', attachmentId)
    .eq('owner_id', ownerId)
    .eq('site_id', siteId)
    .eq('status', 'pending')
    .is('message_id', null)
    .maybeSingle()
  if (!attachment) return Response.json({ removed: true })

  const { error: storageError } = await db.storage
    .from(ATTACHMENT_BUCKET)
    .remove([attachment.storage_path])
  if (storageError)
    return Response.json({ error: 'The file could not be removed. Try again.' }, { status: 503 })
  await db.from('cr_builder_message_attachments').delete().eq('id', attachment.id)
  return Response.json({ removed: true })
}

/** Resolve the signed-in owner only when the requested active website belongs to them. */
async function getOwnerId(siteId: string): Promise<string | undefined> {
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return undefined
  const { data: site } = await supabase
    .from('cr_builder_sites')
    .select('owner_id')
    .eq('id', siteId)
    .eq('owner_id', auth.user.id)
    .is('archived_at', null)
    .maybeSingle()
  return site?.owner_id
}
