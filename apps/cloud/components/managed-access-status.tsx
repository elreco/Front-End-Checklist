'use client'

import { LoaderCircle, ShieldCheck, Trash2 } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { toast } from '@repo/design-system/ui/coderocket-toast'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ProjectManagedAccess } from '@/lib/managed-access'

/** Summarize pending, verified, or failed page access with one clear recovery action. */
export function ManagedAccessStatus({
  connection,
  onChange,
  projectId
}: {
  connection: ProjectManagedAccess
  onChange: (replace: boolean) => void
  projectId: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const pending = connection.status === 'configured'
  const failed = connection.status === 'failed'

  /** Remove every stored access layer only after the owner explicitly requests it. */
  async function revokeAccess() {
    setBusy(true)
    const response = await fetch(`/api/projects/${projectId}/managed-access`, {
      method: 'DELETE'
    })
    setBusy(false)
    if (!response.ok) {
      toast.error('The connection could not be revoked')
      return
    }
    toast.success('Page access revoked')
    router.refresh()
  }

  return (
    <section
      className={`border p-5 ${
        failed
          ? 'border-danger bg-danger/10'
          : pending
            ? 'border-signal bg-signal/10'
            : 'border-success bg-success/10'
      }`}
    >
      <div className="flex items-start gap-3">
        {pending ? (
          <LoaderCircle aria-hidden className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-signal" />
        ) : (
          <ShieldCheck
            aria-hidden
            className={`mt-0.5 h-5 w-5 shrink-0 ${failed ? 'text-danger' : 'text-success'}`}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {pending
              ? 'Checking the test account'
              : failed
                ? 'The protected page is still closed'
                : 'Page access connected'}
          </p>
          <p className="mt-1 text-muted text-sm leading-6">
            {pending
              ? 'CodeRocket saved the dedicated account securely and is trying it in a fresh website check. You can close this window.'
              : failed
                ? 'The latest check could not sign in. Update the test account, or use the developer option if the site requires SSO, MFA, a CAPTCHA, or a private network.'
                : `${connection.displayLabel} is stored encrypted and used only for this monitored site. Automatic checks can now open the selected protected pages.`}
          </p>
          {connection.lastError ? (
            <p className="mt-2 text-danger text-xs">{connection.lastError}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <CodeRocketButton disabled={busy} onClick={() => onChange(failed)} size="sm" type="button">
          {failed ? 'Update access' : 'Add another protection'}
        </CodeRocketButton>
        <CodeRocketButton
          disabled={busy}
          onClick={() => router.refresh()}
          size="sm"
          type="button"
          variant="outline"
        >
          Check connection status
        </CodeRocketButton>
        <CodeRocketButton
          disabled={busy}
          onClick={revokeAccess}
          size="sm"
          type="button"
          variant="ghost"
        >
          {busy ? <LoaderCircle aria-hidden className="animate-spin" /> : <Trash2 aria-hidden />}
          Revoke access
        </CodeRocketButton>
      </div>
    </section>
  )
}
