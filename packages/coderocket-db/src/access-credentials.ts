import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const ENCRYPTION_VERSION = 'v1'
const IV_BYTES = 12

/** Encrypt project request headers with authenticated AES-256-GCM encryption. */
export function encryptAccessHeaders(headers: Record<string, string>): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', readEncryptionKey(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(headers), 'utf8'),
    cipher.final()
  ])
  return [
    ENCRYPTION_VERSION,
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url')
  ].join('.')
}

/** Decrypt and validate one managed-access header bundle without returning unknown values. */
export function decryptAccessHeaders(payload: string): Record<string, string> {
  const [version, encodedIv, encodedTag, encodedCiphertext, extra] = payload.split('.')
  if (
    version !== ENCRYPTION_VERSION ||
    !(encodedIv && encodedTag && encodedCiphertext) ||
    extra !== undefined
  )
    throw new Error('Managed access credentials use an unsupported format')
  const iv = Buffer.from(encodedIv, 'base64url')
  if (iv.byteLength !== IV_BYTES) throw new Error('Managed access credentials are invalid')
  const decipher = createDecipheriv('aes-256-gcm', readEncryptionKey(), iv)
  decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'))
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, 'base64url')),
    decipher.final()
  ]).toString('utf8')
  const parsed: unknown = JSON.parse(plaintext)
  if (!isHeaderRecord(parsed)) throw new Error('Managed access credentials are invalid')
  return parsed
}

function readEncryptionKey(): Buffer {
  const secret = process.env.CODEROCKET_ACCESS_ENCRYPTION_KEY
  if (!secret || secret.length < 32)
    throw new Error('Managed access encryption is not configured')
  return createHash('sha256').update(secret).digest()
}

function isHeaderRecord(value: unknown): value is Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const entries = Object.entries(value)
  return (
    entries.length > 0 &&
    entries.length <= 20 &&
    entries.every(
      ([name, entry]) =>
        /^[a-z0-9!#$%&'*+.^_`|~-]+$/i.test(name) &&
        typeof entry === 'string' &&
        entry.length > 0 &&
        entry.length <= 4096 &&
        !/[\r\n]/.test(entry)
    )
  )
}
