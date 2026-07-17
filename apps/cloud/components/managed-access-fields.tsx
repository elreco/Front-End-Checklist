'use client'

import { CodeRocketInput, CodeRocketTextarea } from '@repo/design-system/ui/coderocket-field'
import type { ManagedAccessKind } from '@/lib/managed-access'

/** Render only the fields required by the selected managed-access method. */
export function ManagedAccessFields({ kind }: { kind: ManagedAccessKind }) {
  if (kind === 'vercel')
    return (
      <AccessField
        autoComplete="off"
        help="Create an Automation Bypass secret in Vercel, then paste it here."
        label="Vercel bypass secret"
        name="secret"
      />
    )
  if (kind === 'cloudflare')
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <AccessField
          autoComplete="off"
          help="The ID of a dedicated Cloudflare Access service token."
          label="Client ID"
          name="clientId"
        />
        <AccessField
          autoComplete="off"
          help="The matching service-token secret."
          label="Client secret"
          name="clientSecret"
          type="password"
        />
      </div>
    )
  if (kind === 'basic_auth')
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <AccessField
          autoComplete="username"
          help="The dedicated preview or staging username."
          label="Username"
          name="username"
        />
        <AccessField
          autoComplete="current-password"
          help="Use a revocable preview password, not your personal account."
          label="Password"
          name="password"
          type="password"
        />
      </div>
    )
  if (kind === 'bearer_token')
    return (
      <AccessField
        autoComplete="off"
        help="Use a restricted, read-only token created only for website checks."
        label="Dedicated access token"
        name="token"
        type="password"
      />
    )
  if (kind === 'session_cookie')
    return (
      <AccessField
        autoComplete="off"
        help="Paste only the Cookie header value from a dedicated test session. Never use your normal personal session."
        label="Dedicated test-session cookie"
        name="cookie"
        type="password"
      />
    )
  return (
    <label className="block font-semibold text-sm" htmlFor="managed-access-headers">
      Request headers
      <CodeRocketTextarea
        aria-describedby="custom-headers-help"
        className="min-h-28 font-mono text-xs"
        id="managed-access-headers"
        name="headers"
        placeholder={'X-Preview-Token: …\nX-Custom-Access: …'}
        required
      />
      <span
        className="mt-2 block font-normal text-muted text-xs leading-5"
        id="custom-headers-help"
      >
        One header per line. Host, User-Agent, and other unsafe transport overrides are rejected.
      </span>
    </label>
  )
}

/** Render one consistently labelled secret or identifier field with inline guidance. */
function AccessField({
  help,
  label,
  name,
  type = 'text',
  autoComplete
}: {
  autoComplete: string
  help: string
  label: string
  name: string
  type?: 'password' | 'text'
}) {
  const helpId = `${name}-access-help`
  const fieldId = `${name}-managed-access-field`
  return (
    <label className="block font-semibold text-sm" htmlFor={fieldId}>
      {label}
      <CodeRocketInput
        aria-describedby={helpId}
        autoComplete={autoComplete}
        id={fieldId}
        name={name}
        required
        type={type}
      />
      <span className="mt-2 block font-normal text-muted text-xs leading-5" id={helpId}>
        {help}
      </span>
    </label>
  )
}
