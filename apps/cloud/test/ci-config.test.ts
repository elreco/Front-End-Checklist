import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildCiAuditCommand,
  buildCiConfiguration,
  getCiConfigLocation,
  getCiPlatformLabel,
  getCiSecretLocation
} from '../lib/ci-config'

const project = {
  siteUrl: 'https://example.com',
  pages: ['/', '/pricing', '/account'],
  plan: 'free' as const
}

describe('secure runner configuration', () => {
  it('audits each configured page exactly once', () => {
    const command = buildCiAuditCommand({ ...project, authenticatedPages: ['/account'] })
    assert.equal(
      command,
      "npx @coderocketapp/cli@latest audit 'https://example.com/' --explicit-pages --page '/' --page '/pricing' --authenticated-page '/account' --environment production"
    )
  })

  it('generates a scheduled GitHub workflow with protected secrets', () => {
    const workflow = buildCiConfiguration('github', project)
    assert.match(workflow, /CodeRocket secure website check/)
    assert.match(workflow, /workflow_dispatch:/)
    assert.match(workflow, /cron: '17 7 \* \* 1'/)
    assert.match(workflow, /secrets\.CODEROCKET_TOKEN/)
    assert.match(workflow, /secrets\.CODEROCKET_SITE_HEADERS_JSON/)
    assert.match(workflow, /secrets\.CODEROCKET_AUTH_HEADERS_JSON/)
  })

  it('uses a self-hosted GitHub runner for private networks', () => {
    const workflow = buildCiConfiguration('github', {
      ...project,
      accessMethods: ['cloudflare', 'account', 'network']
    })
    assert.match(workflow, /runs-on: self-hosted/)
  })

  it('generates GitLab, Bitbucket, and generic configurations around the same command', () => {
    const gitlab = buildCiConfiguration('gitlab', project)
    assert.match(gitlab, /CI_PIPELINE_SOURCE/)
    assert.doesNotMatch(gitlab, /CI_DEFAULT_BRANCH/)
    assert.match(buildCiConfiguration('bitbucket', project), /custom:\n {4}coderocket:/)
    assert.match(buildCiConfiguration('other', project), /protected secret store/)
    for (const platform of ['gitlab', 'bitbucket', 'other'] as const) {
      assert.match(buildCiConfiguration(platform, project), /@coderocketapp\/cli@latest audit/)
    }
  })

  it('provides plain-language provider metadata', () => {
    assert.equal(getCiPlatformLabel('github'), 'GitHub Actions')
    assert.equal(getCiConfigLocation('gitlab'), '.gitlab-ci.yml')
    assert.match(getCiSecretLocation('bitbucket'), /Repository variables/)
  })
})
