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

describe('CI setup configuration', () => {
  it('audits each configured page exactly once', () => {
    const command = buildCiAuditCommand(project)
    assert.equal(
      command,
      "npx @coderocket/cli@latest audit 'https://example.com/' --page '/pricing' --page '/account' --environment production"
    )
  })

  it('generates a scheduled GitHub workflow with protected secrets', () => {
    const workflow = buildCiConfiguration('github', project)
    assert.match(workflow, /workflow_dispatch:/)
    assert.match(workflow, /cron: '17 7 \* \* 1'/)
    assert.match(workflow, /secrets\.CODEROCKET_TOKEN/)
    assert.match(workflow, /secrets\.CODEROCKET_SITE_HEADERS_JSON/)
  })

  it('generates GitLab, Bitbucket, and generic configurations around the same command', () => {
    assert.match(buildCiConfiguration('gitlab', project), /CI_PIPELINE_SOURCE/)
    assert.match(buildCiConfiguration('bitbucket', project), /custom:\n {4}coderocket:/)
    assert.match(buildCiConfiguration('other', project), /protected secret store/)
    for (const platform of ['gitlab', 'bitbucket', 'other'] as const) {
      assert.match(buildCiConfiguration(platform, project), /@coderocket\/cli@latest audit/)
    }
  })

  it('provides plain-language provider metadata', () => {
    assert.equal(getCiPlatformLabel('github'), 'GitHub Actions')
    assert.equal(getCiConfigLocation('gitlab'), '.gitlab-ci.yml')
    assert.match(getCiSecretLocation('bitbucket'), /Repository variables/)
  })
})
