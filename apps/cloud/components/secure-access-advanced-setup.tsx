'use client'

import { CheckCircle2, Copy, KeyRound, LoaderCircle } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { toast } from '@repo/design-system/ui/coderocket-toast'
import { useState } from 'react'
import type { CiPlatform } from '@/lib/ci-config'
import { getCiPlatformLabel, getCiSecretLocation } from '@/lib/ci-config'
import { getAccessGuidance, type SecureAccessMethod } from '@/lib/secure-access-copy'

interface TokenResponse {
  message: string
  prefix: string
  token: string
}

/** Keep credentials and raw configuration inside an explicit advanced disclosure. */
export function SecureAccessAdvancedSetup({
  accessMethods,
  configuration,
  configured,
  plan,
  platform,
  projectId
}: {
  accessMethods: readonly SecureAccessMethod[]
  configuration: string
  configured: boolean
  plan: 'free' | 'solo' | 'agency'
  platform: CiPlatform
  projectId: string
}) {
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState('')

  /** Create one project-scoped credential for the selected runner. */
  async function createToken() {
    setLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/tokens`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: `${getCiPlatformLabel(platform)} secure access` })
      })
      const payload: unknown = await response.json()
      if (!response.ok || !isTokenResponse(payload)) throw new Error(readError(payload))
      setToken(payload.token)
      toast.success('Project key created', {
        description: `Save it in ${getCiPlatformLabel(platform)} now. CodeRocket stores only its secure hash.`
      })
    } catch (error) {
      toast.error('Project key could not be created', {
        description: error instanceof Error ? error.message : 'Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  /** Copy a generated value and report clipboard failures. */
  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`${label} could not be copied`)
    }
  }

  return (
    <details className="border border-border bg-background">
      <summary className="cursor-pointer p-4 font-semibold text-sm transition-colors hover:bg-surface-raised">
        Set it up myself — advanced
      </summary>
      <div className="space-y-5 border-border border-t p-4 sm:p-5">
        <SetupSection number="01" title="Create a project key">
          <p className="text-muted text-sm leading-6">
            Save this site-specific key as <code>CODEROCKET_TOKEN</code> in{' '}
            {getCiSecretLocation(platform)}. Never commit or email it.
          </p>
          {token ? (
            <div className="mt-4 border border-signal bg-surface p-4">
              <p className="font-mono text-[10px] text-signal uppercase tracking-[.1em]">
                Shown once · copy it now
              </p>
              <code className="mt-3 block max-h-24 overflow-auto break-all border border-border bg-background p-3 text-xs leading-6">
                {token}
              </code>
              <CodeRocketButton
                className="mt-3"
                onClick={() => copyValue(token, 'Project key')}
                size="sm"
                type="button"
              >
                <Copy aria-hidden /> Copy project key
              </CodeRocketButton>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <CodeRocketButton
                disabled={loading}
                onClick={createToken}
                size="sm"
                type="button"
                variant={configured ? 'outline' : 'primary'}
              >
                {loading ? (
                  <LoaderCircle aria-hidden className="animate-spin" />
                ) : (
                  <KeyRound aria-hidden />
                )}
                {loading ? 'Creating…' : configured ? 'Create another key' : 'Create project key'}
              </CodeRocketButton>
              {configured ? (
                <span className="inline-flex items-center gap-2 text-success text-xs">
                  <CheckCircle2 aria-hidden className="h-4 w-4" /> A key already exists
                </span>
              ) : null}
            </div>
          )}
        </SetupSection>

        <SetupSection number="02" title="Give the runner the required access">
          <p className="text-muted text-sm leading-6">{getAccessGuidance(accessMethods)}</p>
          {accessMethods.some(
            method =>
              method === 'account' ||
              method === 'basic_auth' ||
              method === 'cloudflare' ||
              method === 'custom_headers' ||
              method === 'unknown'
          ) ? (
            <p className="mt-3 text-muted text-xs leading-5">
              Use <code>CODEROCKET_SITE_HEADERS_JSON</code> for edge access applied to every page,
              and <code>CODEROCKET_AUTH_HEADERS_JSON</code> for the application session applied only
              to pages marked “Sign-in required”. Neither value is included in the result.
            </p>
          ) : null}
        </SetupSection>

        <SetupSection number="03" title="Add the generated configuration">
          <p className="mb-3 text-muted text-sm leading-6">
            The generated job installs an isolated browser, opens the pages where this runner has
            access, and sends only the check result back to CodeRocket.
          </p>
          <div className="relative mt-3">
            <CodeRocketButton
              aria-label="Copy secure runner configuration"
              className="absolute top-2 right-2 z-10"
              onClick={() => copyValue(configuration, 'Configuration')}
              size="sm"
              type="button"
              variant="outline"
            >
              <Copy aria-hidden /> Copy
            </CodeRocketButton>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap border border-border bg-surface p-4 pr-24 font-mono text-xs leading-6">
              <code>{configuration}</code>
            </pre>
          </div>
        </SetupSection>

        <SetupSection number="04" title="Run one check to confirm access">
          <p className="text-muted text-sm leading-6">
            Start the generated job manually. CodeRocket shows “Secure access connected” after the
            first result arrives. GitHub also includes the {plan === 'free' ? 'weekly' : 'daily'}{' '}
            schedule; configure the equivalent schedule on other platforms.
          </p>
        </SetupSection>
      </div>
    </details>
  )
}

/** Render one numbered technical setup section. */
function SetupSection({
  children,
  number,
  title
}: {
  children: React.ReactNode
  number: string
  title: string
}) {
  return (
    <section>
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] text-signal">{number}</span>
        <h3 className="font-heading font-semibold text-base">{title}</h3>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  )
}

/** Confirm whether an API payload contains a newly created project key. */
function isTokenResponse(value: unknown): value is TokenResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'token' in value &&
    typeof value.token === 'string'
  )
}

/** Extract a safe API error without exposing an unknown payload. */
function readError(value: unknown): string {
  if (typeof value === 'object' && value !== null && 'error' in value) {
    const error = value.error
    if (typeof error === 'string') return error
  }
  return 'Please try again.'
}
