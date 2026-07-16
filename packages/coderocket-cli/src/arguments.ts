import type { AuditEnvironment } from '@coderocket/core'

export interface CliOptions {
  url: string
  token: string
  environment: AuditEnvironment
  sha?: string
  branch?: string
  pr?: string
  apiUrl: string
}

function valueAfter(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}

/** Parse the stable public command contract without adding a CLI framework. */
export function parseArguments(args: string[], environment: NodeJS.ProcessEnv): CliOptions {
  if (args[0] !== 'audit' || !args[1])
    throw new Error('Usage: coderocket audit <https-url> --token <token> [options]')
  const url = new URL(args[1])
  if (url.protocol !== 'https:') throw new Error('Audit URL must use HTTPS')
  const token = valueAfter(args, '--token') ?? environment.CODEROCKET_TOKEN
  if (!token) throw new Error('A project token is required via --token or CODEROCKET_TOKEN')
  const environmentName = valueAfter(args, '--environment') ?? 'preview'
  if (environmentName !== 'preview' && environmentName !== 'production')
    throw new Error('Environment must be preview or production')
  return {
    url: url.toString(),
    token,
    environment: environmentName,
    sha: valueAfter(args, '--sha'),
    branch: valueAfter(args, '--branch'),
    pr: valueAfter(args, '--pr'),
    apiUrl: environment.CODEROCKET_API_URL ?? 'https://coderocket.app/api/v1/audits'
  }
}
