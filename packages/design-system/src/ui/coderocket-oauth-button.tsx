import type { ComponentType } from 'react'
import { FacebookBrandIcon, GitHubBrandIcon, GoogleBrandIcon } from '../brand-icons'
import { CodeRocketButton } from './coderocket-button'

export type OAuthProvider = 'github' | 'google' | 'facebook'

const providers: Record<
  OAuthProvider,
  { color: string; icon: ComponentType<{ className?: string }>; label: string }
> = {
  github: { color: 'text-foreground', icon: GitHubBrandIcon, label: 'GitHub' },
  google: { color: 'text-[#4285f4]', icon: GoogleBrandIcon, label: 'Google' },
  facebook: { color: 'text-[#0866ff]', icon: FacebookBrandIcon, label: 'Facebook' }
}

export interface CodeRocketOAuthButtonProps {
  disabled?: boolean
  onClick: () => void
  pending?: boolean
  provider: OAuthProvider
}

/** Renders a consistent OAuth action with its official provider icon. */
export function CodeRocketOAuthButton({
  disabled = false,
  onClick,
  pending = false,
  provider
}: CodeRocketOAuthButtonProps) {
  const providerConfig = providers[provider]
  const Icon = providerConfig.icon
  return (
    <CodeRocketButton
      aria-busy={pending}
      className="gap-2 px-3"
      disabled={disabled}
      fullWidth
      onClick={onClick}
      type="button"
      variant="outline"
    >
      <Icon className={`h-4 w-4 ${providerConfig.color}`} />
      {pending ? 'Connecting…' : providerConfig.label}
    </CodeRocketButton>
  )
}
