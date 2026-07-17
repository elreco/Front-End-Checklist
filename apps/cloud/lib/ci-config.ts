import type { SecureAccessMethod } from './secure-access-copy'

export type CiPlatform = 'github' | 'gitlab' | 'bitbucket' | 'other'

interface CiConfigOptions {
  accessMethod?: SecureAccessMethod
  pages: string[]
  plan: 'free' | 'solo' | 'agency'
  siteUrl: string
}

const platformLabels: Record<CiPlatform, string> = {
  github: 'GitHub Actions',
  gitlab: 'GitLab CI/CD',
  bitbucket: 'Bitbucket Pipelines',
  other: 'Another CI platform'
}

const configLocations: Record<CiPlatform, string> = {
  github: '.github/workflows/coderocket.yml',
  gitlab: '.gitlab-ci.yml',
  bitbucket: 'bitbucket-pipelines.yml',
  other: 'Your CI job'
}

const secretLocations: Record<CiPlatform, string> = {
  github: 'Repository settings → Secrets and variables → Actions',
  gitlab: 'Settings → CI/CD → Variables',
  bitbucket: 'Repository settings → Repository variables',
  other: 'the protected secret store used by your CI platform'
}

/** Return the user-facing platform name used throughout guided CI setup. */
export function getCiPlatformLabel(platform: CiPlatform): string {
  return platformLabels[platform]
}

/** Return where the generated configuration belongs for one CI platform. */
export function getCiConfigLocation(platform: CiPlatform): string {
  return configLocations[platform]
}

/** Return where project credentials should be stored for one CI platform. */
export function getCiSecretLocation(platform: CiPlatform): string {
  return secretLocations[platform]
}

/** Build the production audit command shared by every CI provider template. */
export function buildCiAuditCommand(options: Pick<CiConfigOptions, 'pages' | 'siteUrl'>): string {
  const paths = options.pages.length > 0 ? options.pages : ['/']
  const [firstPath = '/', ...remainingPaths] = paths
  const firstUrl = new URL(firstPath, options.siteUrl).toString()
  const pageArguments = remainingPaths.map(path => ` --page ${quoteShell(path)}`).join('')
  return `npx @coderocketapp/cli@latest audit ${quoteShell(firstUrl)}${pageArguments} --environment production`
}

/** Build a copy-ready provider configuration around the shared CodeRocket CLI. */
export function buildCiConfiguration(platform: CiPlatform, options: CiConfigOptions): string {
  const command = buildCiAuditCommand(options)
  if (platform === 'github')
    return buildGitHubWorkflow(command, options.plan, options.accessMethod === 'network')
  if (platform === 'gitlab') return buildGitLabJob(command)
  if (platform === 'bitbucket') return buildBitbucketPipeline(command)
  return buildGenericJob(command)
}

/** Wrap the audit command in a manual and scheduled GitHub Actions workflow. */
function buildGitHubWorkflow(
  command: string,
  plan: CiConfigOptions['plan'],
  selfHosted: boolean
): string {
  const cron = plan === 'free' ? '17 7 * * 1' : '17 7 * * *'
  const runner = selfHosted ? 'self-hosted' : 'ubuntu-latest'
  return `name: CodeRocket secure website check

on:
  workflow_dispatch:
  schedule:
    - cron: '${cron}'

jobs:
  protected-site-check:
    runs-on: ${runner}
    permissions:
      contents: read
    steps:
      - name: Check protected website HTML
        env:
          CODEROCKET_TOKEN: \${{ secrets.CODEROCKET_TOKEN }}
          CODEROCKET_SITE_HEADERS_JSON: \${{ secrets.CODEROCKET_SITE_HEADERS_JSON }}
        run: >-
          ${command}
`
}

/** Wrap the audit command in a GitLab job for manual and scheduled pipelines. */
function buildGitLabJob(command: string): string {
  return `coderocket-secure-check:
  image: node:22
  script:
    - ${command}
  rules:
    - if: '$CI_PIPELINE_SOURCE == "schedule"'
    - if: '$CI_PIPELINE_SOURCE == "web"'
`
}

/** Wrap the audit command in a named Bitbucket custom pipeline. */
function buildBitbucketPipeline(command: string): string {
  return `image: node:22

pipelines:
  custom:
    coderocket:
      - step:
          name: Check website HTML
          script:
            - ${command}
`
}

/** Add provider-neutral secret guidance to the raw audit command. */
function buildGenericJob(command: string): string {
  return `# Store CODEROCKET_TOKEN in your CI platform's protected secret store.
# Add CODEROCKET_SITE_HEADERS_JSON only when the website needs access headers.
${command}
`
}

/** Quote a generated shell argument without allowing user-controlled command expansion. */
function quoteShell(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`
}
