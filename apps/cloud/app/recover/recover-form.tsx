'use client'

import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketInput } from '@repo/design-system/ui/coderocket-field'
import { toast } from '@repo/design-system/ui/coderocket-toast'
import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function RecoverForm() {
  const [pending, setPending] = useState(false)
  async function submit(formData: FormData) {
    setPending(true)
    const email = String(formData.get('email') ?? '')
    const { error } = await createSupabaseBrowserClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/settings`
    })
    if (error) toast.error('Recovery link could not be sent', { description: error.message })
    else
      toast.success('Check your inbox', {
        description: 'We sent a secure password recovery link to your email address.'
      })
    setPending(false)
  }
  return (
    <form action={submit} className="mt-7 space-y-4">
      <label className="block font-semibold text-sm" htmlFor="recovery-email">
        Email
        <CodeRocketInput id="recovery-email" name="email" required type="email" />
      </label>
      <CodeRocketButton disabled={pending} fullWidth type="submit">
        {pending ? 'Sending…' : 'Send recovery link'}
      </CodeRocketButton>
    </form>
  )
}
