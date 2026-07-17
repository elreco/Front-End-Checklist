#!/usr/bin/env node
import { randomUUID } from 'node:crypto'
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { auditPage, getRulesetVersion } from '@coderocket/core'
import { parseArguments } from './arguments'

/** Run the CLI and return its documented process exit code. */
export async function run(args = process.argv.slice(2)): Promise<0 | 1 | 2> {
  try {
    const options = parseArguments(args, process.env)
    const authenticatedUrls = new Set(options.authenticatedUrls)
    const pages = await Promise.all(
      options.urls.map(url =>
        auditPage(url, {
          requestHeaders: authenticatedUrls.has(url)
            ? { ...options.requestHeaders, ...options.authenticatedRequestHeaders }
            : options.requestHeaders
        })
      )
    )
    const response = await fetch(options.apiUrl, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${options.token}`,
        'content-type': 'application/json',
        'idempotency-key': options.sha ? `${options.environment}:${options.sha}` : randomUUID()
      },
      body: JSON.stringify({
        environment: options.environment,
        trigger: 'ci',
        rulesetVersion: process.env.CODEROCKET_RULESET_VERSION ?? getRulesetVersion(),
        commitSha: options.sha,
        branch: options.branch,
        pullRequest: options.pr,
        pages
      })
    })
    const result: unknown = await response.json()
    if (!response.ok) throw new Error(`CodeRocket API returned ${response.status}`)
    if (!result || typeof result !== 'object' || !('qualityGate' in result))
      throw new Error('CodeRocket returned an invalid response')
    const gate = result.qualityGate
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
    if (gate === 'inconclusive') return 2
    return gate === 'failed' ? 1 : 0
  } catch (error) {
    process.stderr.write(
      `CodeRocket: ${error instanceof Error ? error.message : 'Operational error'}\n`
    )
    return 2
  }
}

const entryPath = process.argv[1]
if (entryPath && realpathSync(entryPath) === fileURLToPath(import.meta.url)) {
  process.exitCode = await run()
}
