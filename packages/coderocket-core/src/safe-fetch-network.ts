import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const DEFAULT_TIMEOUT_MS = 10_000

export interface PublicAddress {
  address: string
  family: number
}

export interface PublicTarget {
  addresses: PublicAddress[]
  url: URL
}

/** Convert a dotted IPv4 address into its unsigned integer representation. */
function ipv4Number(address: string): number | undefined {
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255))
    return undefined
  return parts.reduce((value, part) => value * 256 + part, 0)
}

/** Test one normalized IPv4 number against a CIDR block. */
function isInIpv4Cidr(address: number, base: string, prefix: number): boolean {
  const baseNumber = ipv4Number(base)
  if (baseNumber === undefined) return false
  const blockSize = 2 ** (32 - prefix)
  return Math.floor(address / blockSize) === Math.floor(baseNumber / blockSize)
}

/** Reject local, reserved, carrier, multicast, and documentation IPv4 ranges. */
function isBlockedIpv4(address: string): boolean {
  const numeric = ipv4Number(address)
  if (numeric === undefined) return true
  return [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.0.2.0', 24],
    ['192.88.99.0', 24],
    ['192.168.0.0', 16],
    ['198.18.0.0', 15],
    ['198.51.100.0', 24],
    ['203.0.113.0', 24],
    ['224.0.0.0', 4],
    ['240.0.0.0', 4]
  ].some(([base, prefix]) => isInIpv4Cidr(numeric, String(base), Number(prefix)))
}

/** Parse compressed, mapped, and ordinary IPv6 text into one integer. */
function parseIpv6(address: string): bigint | undefined {
  let normalized = address.toLowerCase().split('%')[0] ?? address.toLowerCase()
  if (normalized.includes('.')) {
    const lastColon = normalized.lastIndexOf(':')
    const mapped = ipv4Number(normalized.slice(lastColon + 1))
    if (lastColon < 0 || mapped === undefined) return undefined
    normalized = `${normalized.slice(0, lastColon)}:${(mapped >>> 16).toString(16)}:${(
      mapped & 0xffff
    ).toString(16)}`
  }
  if (normalized.split('::').length > 2) return undefined
  const [left = '', right = ''] = normalized.split('::')
  const leftParts = left ? left.split(':') : []
  const rightParts = right ? right.split(':') : []
  const missing = 8 - leftParts.length - rightParts.length
  if (missing < 0 || (!normalized.includes('::') && missing !== 0)) return undefined
  const parts = [...leftParts, ...Array.from({ length: missing }, () => '0'), ...rightParts]
  if (parts.length !== 8 || parts.some(part => !/^[0-9a-f]{1,4}$/.test(part))) return undefined
  return parts.reduce((value, part) => (value << 16n) + BigInt(`0x${part}`), 0n)
}

/** Test one normalized IPv6 number against a CIDR block. */
function isInIpv6Cidr(address: bigint, base: string, prefix: number): boolean {
  const baseNumber = parseIpv6(base)
  if (baseNumber === undefined) return false
  const shift = BigInt(128 - prefix)
  return address >> shift === baseNumber >> shift
}

/** Reject local, reserved, mapped-private, multicast, and transition IPv6 ranges. */
function isBlockedIpv6(address: string): boolean {
  const numeric = parseIpv6(address)
  if (numeric === undefined) return true
  if (isInIpv6Cidr(numeric, '::ffff:0:0', 96)) {
    const mapped = Number(numeric & 0xffffffffn)
    const dotted = [24, 16, 8, 0].map(shift => (mapped >>> shift) & 255).join('.')
    return isBlockedIpv4(dotted)
  }
  return [
    ['::', 96],
    ['64:ff9b:1::', 48],
    ['100::', 64],
    ['2001::', 32],
    ['2001:2::', 48],
    ['2001:db8::', 32],
    ['2002::', 16],
    ['fc00::', 7],
    ['fe80::', 10],
    ['fec0::', 10],
    ['ff00::', 8]
  ].some(([base, prefix]) => isInIpv6Cidr(numeric, String(base), Number(prefix)))
}

/** Create the stable timeout error shown for DNS and network deadlines. */
function abortError(): Error {
  return new Error('Website request timed out')
}

/** Resolve every address while honoring a bounded abort signal. */
async function resolveAddresses(hostname: string, signal: AbortSignal): Promise<PublicAddress[]> {
  if (isIP(hostname)) return [{ address: hostname, family: isIP(hostname) }]
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      lookup(hostname, { all: true, verbatim: true }),
      new Promise<never>((_resolve, reject) => {
        if (signal.aborted) reject(abortError())
        signal.addEventListener('abort', () => reject(abortError()), { once: true })
        timer = setTimeout(() => reject(abortError()), DEFAULT_TIMEOUT_MS)
      })
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** Parse an HTTPS URL, pin its DNS answers, and reject every non-public address. */
export async function resolvePublicTarget(
  rawUrl: string,
  signal: AbortSignal
): Promise<PublicTarget> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('Website URL is invalid')
  }
  if (url.protocol !== 'https:') throw new Error('Only HTTPS URLs are allowed')
  if (url.username || url.password) throw new Error('URL credentials are not allowed')
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (hostname === 'localhost' || hostname.endsWith('.localhost'))
    throw new Error('Local hosts are not allowed')
  const addresses = await resolveAddresses(hostname, signal)
  if (addresses.length === 0) throw new Error('Hostname did not resolve')
  for (const { address, family } of addresses) {
    if ((family === 4 && isBlockedIpv4(address)) || (family === 6 && isBlockedIpv6(address)))
      throw new Error('Private or reserved networks are not allowed')
  }
  return { url, addresses }
}
