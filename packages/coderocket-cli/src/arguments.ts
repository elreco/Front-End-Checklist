import { type AuditEnvironment, normalizeAuditPath } from '@coderocket/core'

export interface CliOptions {
  url: string
  urls: string[]
  token: string
  environment: AuditEnvironment
  sha?: string
  branch?: string
  pr?: string
  apiUrl: string
  requestHeaders?: Record<string, string>
}

function valueAfter(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}

function valuesAfter(args: string[], flag: string): string[] {
  return args.flatMap((value, index) =>
    value === flag && args[index + 1] ? [args[index + 1]] : []
  )
}

/** Parse the stable public command contract without adding a CLI framework. */
export function parseArguments(args: string[], environment: NodeJS.ProcessEnv): CliOptions {
  if (args[0] !== 'audit' || !args[1])
    throw new Error('Usage: coderocket audit <https-url> --token <token> [options]')
  const url = new URL(args[1])
  if (url.protocol !== 'https:') throw new Error('Audit URL must use HTTPS')
  const urls = [url, ...valuesAfter(args, '--page').map(value => new URL(value, url))]
  if (urls.some(page => page.protocol !== 'https:' || page.origin !== url.origin))
    throw new Error('Every --page must stay on the same audited HTTPS origin')
  const pagePaths = urls.map(page => normalizeAuditPath(page.pathname))
  if (new Set(pagePaths).size !== pagePaths.length)
    throw new Error('Every audited page must have a unique path')
  const token = valueAfter(args, '--token') ?? environment.CODEROCKET_TOKEN
  if (!token) throw new Error('A project token is required via --token or CODEROCKET_TOKEN')
  const environmentName = valueAfter(args, '--environment') ?? 'preview'
  if (environmentName !== 'preview' && environmentName !== 'production')
    throw new Error('Environment must be preview or production')
  return {
    url: url.toString(),
    urls: urls.map(page => page.toString()),
    token,
    environment: environmentName,
    sha: valueAfter(args, '--sha'),
    branch: valueAfter(args, '--branch'),
    pr: valueAfter(args, '--pr'),
    apiUrl: environment.CODEROCKET_API_URL ?? 'https://www.coderocket.app/api/v1/audits',
    requestHeaders: parseRequestHeaders(environment.CODEROCKET_SITE_HEADERS_JSON)
  }
}

function parseRequestHeaders(raw: string | undefined): Record<string, string> | undefined {
  if (!raw) return undefined
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    throw new Error('CODEROCKET_SITE_HEADERS_JSON must be valid JSON')
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('CODEROCKET_SITE_HEADERS_JSON must be a JSON object')
  const headers: Record<string, string> = {}
  for (const [name, headerValue] of Object.entries(value)) {
    if (typeof headerValue !== 'string')
      throw new Error('Every CODEROCKET_SITE_HEADERS_JSON value must be a string')
    headers[name] = headerValue
  }
  return headers
}
