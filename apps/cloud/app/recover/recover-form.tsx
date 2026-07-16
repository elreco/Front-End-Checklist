'use client'

import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketInput } from '@repo/design-system/ui/coderocket-field'
import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function RecoverForm() {
  const [message, setMessage] = useState<string>()
  async function submit(formData: FormData) {
    const email = String(formData.get('email') ?? '')
    const { error } = await createSupabaseBrowserClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/settings`
    })
    setMessage(error?.message ?? 'Check your inbox for the recovery link.')
  }
  return (
    <form action={submit} className="mt-7 space-y-4">
      <label className="block font-semibold text-sm" htmlFor="recovery-email">
        Email
        <CodeRocketInput id="recovery-email" name="email" required type="email" />
      </label>
      <CodeRocketButton fullWidth type="submit">
        Send recovery link
      </CodeRocketButton>
      {message ? (
        <p aria-live="polite" className="rounded-none bg-surface-raised p-3 text-sm">
          {message}
        </p>
      ) : null}
    </form>
  )
}
