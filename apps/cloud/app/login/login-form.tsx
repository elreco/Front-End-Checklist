'use client'

import { Mail } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketInput } from '@repo/design-system/ui/coderocket-field'
import {
  CodeRocketOAuthButton,
  type OAuthProvider
} from '@repo/design-system/ui/coderocket-oauth-button'
import { toast } from '@repo/design-system/ui/coderocket-toast'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type PendingAction = OAuthProvider | 'password' | 'magic'

export function LoginForm() {
  const search = useSearchParams()
  const [pendingAction, setPendingAction] = useState<PendingAction>()
  const isPending = pendingAction !== undefined

  async function signInWithProvider(provider: OAuthProvider) {
    setPendingAction(provider)
    const supabase = createSupabaseBrowserClient()
    const next = search.get('next') ?? '/dashboard'
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      }
    })
    if (error) {
      toast.error(`Could not continue with ${provider}`, { description: error.message })
      setPendingAction(undefined)
    }
  }

  async function submit(formData: FormData) {
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')
    const mode = String(formData.get('mode') ?? 'password') as 'password' | 'magic'
    setPendingAction(mode)
    const supabase = createSupabaseBrowserClient()
    if (mode === 'magic') {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` }
      })
      if (error) toast.error('Magic link could not be sent', { description: error.message })
      else
        toast.success('Check your inbox', {
          description: 'We sent a secure CodeRocket sign-in link to your email address.'
        })
      setPendingAction(undefined)
      return
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error('Sign-in failed', { description: error.message })
      setPendingAction(undefined)
      return
    }
    window.location.assign(search.get('next') ?? '/dashboard')
  }

  return (
    <div className="mt-8">
      <div className="grid gap-2 sm:grid-cols-3">
        {(['github', 'google', 'facebook'] as const).map(provider => (
          <CodeRocketOAuthButton
            disabled={isPending}
            key={provider}
            onClick={() => signInWithProvider(provider)}
            pending={pendingAction === provider}
            provider={provider}
          />
        ))}
      </div>

      <div className="my-7 flex items-center gap-4 text-muted text-xs uppercase tracking-[.12em]">
        <span className="h-px flex-1 bg-border" />
        or use your email
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={submit} className="space-y-5">
        <label className="block font-semibold text-sm" htmlFor="login-email">
          Email address
          <CodeRocketInput
            autoComplete="email"
            className="h-12"
            id="login-email"
            name="email"
            placeholder="you@agency.com"
            required
            type="email"
          />
        </label>
        <div>
          <div className="flex items-center justify-between gap-4">
            <label className="font-semibold text-sm" htmlFor="login-password">
              Password
            </label>
            <CodeRocketButton asChild variant="link">
              <Link href="/recover">Forgot password?</Link>
            </CodeRocketButton>
          </div>
          <CodeRocketInput
            autoComplete="current-password"
            className="h-12"
            id="login-password"
            minLength={6}
            name="password"
            type="password"
          />
        </div>
        <CodeRocketButton
          disabled={isPending}
          fullWidth
          name="mode"
          size="lg"
          type="submit"
          value="password"
        >
          {pendingAction === 'password' ? 'Signing in…' : 'Sign in'}
        </CodeRocketButton>
        <CodeRocketButton
          disabled={isPending}
          fullWidth
          name="mode"
          size="lg"
          type="submit"
          value="magic"
          variant="outline"
        >
          <Mail aria-hidden />
          {pendingAction === 'magic' ? 'Sending link…' : 'Send me a sign-in link'}
        </CodeRocketButton>
      </form>

      <p className="mt-7 text-center text-muted text-xs leading-5">
        By continuing, you agree to the CodeRocket{' '}
        <Link className="text-foreground hover:text-signal" href="/legal/terms">
          Terms
        </Link>{' '}
        and{' '}
        <Link className="text-foreground hover:text-signal" href="/legal/privacy">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  )
}
