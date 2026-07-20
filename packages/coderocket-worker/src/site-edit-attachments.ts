import { createHash } from 'node:crypto'
import type { SiteEditAttachmentInput } from '@coderocket/ai'
import type { SiteEditPlan } from '@coderocket/core'
import type { createServiceClient } from '@coderocket/db'

const PRIVATE_BUCKET = 'cr-builder-prompt-files'
const PUBLIC_ASSET_BUCKET = 'cr-builder-assets'

interface StoredAttachment {
  byte_size: number
  file_name: string
  id: string
  mime_type: string
  storage_path: string
}

export interface LoadedSiteEditAttachment {
  bytes: Uint8Array
  input: SiteEditAttachmentInput
}

/** Load only the three private files explicitly bound to the queued user message. */
export async function loadSiteEditAttachments(
  db: ReturnType<typeof createServiceClient>,
  ownerId: string,
  siteId: string,
  messageId: string
): Promise<LoadedSiteEditAttachment[]> {
  const { data, error } = await db
    .from('cr_builder_message_attachments')
    .select('id,file_name,mime_type,byte_size,storage_path')
    .eq('owner_id', ownerId)
    .eq('site_id', siteId)
    .eq('message_id', messageId)
    .eq('status', 'attached')
    .order('created_at', { ascending: true })
    .limit(3)
  if (error) throw new Error(error.message)
  return Promise.all((data ?? []).map(attachment => downloadAttachment(db, attachment)))
}

/** Promote only image files the validated edit plan actually places in the new version. */
export async function resolveSiteEditAttachmentImages(
  db: ReturnType<typeof createServiceClient>,
  plan: SiteEditPlan,
  attachments: LoadedSiteEditAttachment[],
  ownerId: string,
  siteId: string
): Promise<SiteEditPlan> {
  const byId = new Map(attachments.map(attachment => [attachment.input.id, attachment]))
  const publicUrls = new Map<string, string>()
  for (const operation of plan.operations) {
    if (!('attachmentId' in operation) || !operation.attachmentId) continue
    const attachment = byId.get(operation.attachmentId)
    if (!attachment?.input.mimeType.startsWith('image/'))
      throw new Error('The selected reference is not a usable website image')
    let publicUrl = publicUrls.get(operation.attachmentId)
    if (!publicUrl) {
      publicUrl = await publishAttachmentImage(db, attachment, ownerId, siteId)
      publicUrls.set(operation.attachmentId, publicUrl)
    }
    operation.imageUrl = publicUrl
  }
  return plan
}

/** Download and verify one message-bound object before transient model use. */
async function downloadAttachment(
  db: ReturnType<typeof createServiceClient>,
  attachment: StoredAttachment
): Promise<LoadedSiteEditAttachment> {
  const { data, error } = await db.storage.from(PRIVATE_BUCKET).download(attachment.storage_path)
  if (error || !data) throw new Error('A reference file is no longer available')
  const bytes = new Uint8Array(await data.arrayBuffer())
  if (bytes.byteLength !== attachment.byte_size)
    throw new Error('A reference file could not be verified')
  return {
    bytes,
    input: {
      dataUrl: `data:${attachment.mime_type};base64,${Buffer.from(bytes).toString('base64')}`,
      id: attachment.id,
      mimeType: attachment.mime_type,
      name: attachment.file_name
    }
  }
}

/** Copy one selected private image into the site's durable public asset namespace. */
async function publishAttachmentImage(
  db: ReturnType<typeof createServiceClient>,
  attachment: LoadedSiteEditAttachment,
  ownerId: string,
  siteId: string
): Promise<string> {
  const digest = createHash('sha256').update(attachment.bytes).digest('hex').slice(0, 24)
  const extension = attachment.input.name.split('.').at(-1)?.toLowerCase() ?? 'image'
  const storagePath = `${ownerId}/${siteId}/iterations/${digest}.${extension}`
  const { error } = await db.storage
    .from(PUBLIC_ASSET_BUCKET)
    .upload(storagePath, attachment.bytes, {
      cacheControl: '31536000',
      contentType: attachment.input.mimeType,
      upsert: true
    })
  if (error) throw new Error('The selected image could not be added to the website')
  return db.storage.from(PUBLIC_ASSET_BUCKET).getPublicUrl(storagePath).data.publicUrl
}
