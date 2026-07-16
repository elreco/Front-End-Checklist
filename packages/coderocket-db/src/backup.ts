import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { open, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { createServiceClient } from './index'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required for the migration backup')
const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-')
const filename = `coderocket-pre-migration-${timestamp}.dump`
const output = path.join(tmpdir(), filename)
const maxPartSize = 5 * 1024 * 1024

try {
  await promisify(execFile)('pg_dump', [
    databaseUrl,
    '--format=custom',
    '--no-owner',
    '--no-acl',
    '--file',
    output
  ])
  const db = createServiceClient()
  await db.storage.createBucket('cr-migration-backups', { public: false }).catch(() => undefined)
  const storage = db.storage.from('cr-migration-backups')
  const file = await open(output, 'r')
  const totalBytes = (await file.stat()).size
  const partCount = Math.ceil(totalBytes / maxPartSize)
  const uploadedParts: string[] = []
  const parts: Array<{ bytes: number; name: string; sha256: string }> = []
  try {
    for (let index = 0; index < partCount; index += 1) {
      const offset = index * maxPartSize
      const bytes = Math.min(maxPartSize, totalBytes - offset)
      const chunk = Buffer.allocUnsafe(bytes)
      const { bytesRead } = await file.read(chunk, 0, bytes, offset)
      if (bytesRead !== bytes)
        throw new Error(`Expected ${bytes} bytes for backup part ${index + 1}, read ${bytesRead}`)
      const partName = `${filename}.part-${String(index + 1).padStart(4, '0')}`
      let uploadError: Error | undefined
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const { error } = await storage.upload(partName, chunk, {
          contentType: 'application/octet-stream',
          upsert: false
        })
        if (!error) {
          uploadError = undefined
          break
        }
        uploadError = new Error(error.message)
        if (attempt < 3)
          await new Promise(resolve => {
            setTimeout(resolve, attempt * 750)
          })
      }
      if (uploadError) throw uploadError
      uploadedParts.push(partName)
      parts.push({
        bytes,
        name: partName,
        sha256: createHash('sha256').update(chunk).digest('hex')
      })
    }
    const manifestName = `${filename}.manifest.json`
    const manifest = Buffer.from(
      JSON.stringify({
        format: 'pg_dump-custom-split-v1',
        sourceFile: filename,
        totalBytes,
        parts
      })
    )
    const { error } = await storage.upload(manifestName, manifest, {
      contentType: 'application/json',
      upsert: false
    })
    if (error) throw new Error(error.message)
    process.stdout.write(
      `${JSON.stringify({ event: 'backup.uploaded', manifest: manifestName, partCount, totalBytes })}\n`
    )
  } catch (error) {
    if (uploadedParts.length > 0) await storage.remove(uploadedParts)
    throw error
  } finally {
    await file.close()
  }
} finally {
  await rm(output, { force: true })
}
