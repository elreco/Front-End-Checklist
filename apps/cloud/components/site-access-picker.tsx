import type { SiteAccessMode } from '@coderocket/core'
import { Cloud, LockKeyhole, ShieldCheck } from '@repo/design-system/icons'

const options = [
  {
    value: 'public',
    icon: Cloud,
    title: 'Anyone can open it',
    description: 'Best for public websites. CodeRocket checks it from the cloud with no setup.',
    badge: 'Simplest'
  },
  {
    value: 'protected',
    icon: ShieldCheck,
    title: 'It has bot protection',
    description: 'Choose this for Cloudflare, a firewall, or a password in front of public pages.',
    badge: 'Access test'
  },
  {
    value: 'private',
    icon: LockKeyhole,
    title: 'People must sign in',
    description: 'Choose this for customer accounts, private previews, or an internal application.',
    badge: 'Runner needed'
  }
] as const

/** Pick the honest reachability contract before a website is added. */
export function SiteAccessPicker({
  value,
  onChange
}: {
  value: SiteAccessMode
  onChange: (mode: SiteAccessMode) => void
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {options.map(option => {
        const Icon = option.icon
        const selected = option.value === value
        return (
          <label
            className={`relative cursor-pointer border p-4 transition-colors focus-within:outline-2 focus-within:outline-signal focus-within:outline-offset-2 ${
              selected
                ? 'border-signal bg-signal/10'
                : 'border-border bg-background hover:border-accent'
            }`}
            key={option.value}
          >
            <input
              checked={selected}
              className="sr-only"
              name="accessMode"
              onChange={() => onChange(option.value)}
              required
              type="radio"
              value={option.value}
            />
            <span className="flex items-start justify-between gap-3">
              <span className="flex h-9 w-9 items-center justify-center border border-border bg-surface">
                <Icon aria-hidden className="h-4 w-4 text-signal" />
              </span>
              <span className="font-mono text-[10px] text-muted uppercase tracking-[.1em]">
                {option.badge}
              </span>
            </span>
            <span className="mt-4 block font-semibold text-sm">{option.title}</span>
            <span className="mt-2 block text-muted text-xs leading-5">{option.description}</span>
          </label>
        )
      })}
    </div>
  )
}

/** Explain the operational consequence of the selected access mode. */
export function SiteAccessExplanation({ mode }: { mode: SiteAccessMode }) {
  const content = getAccessExplanation(mode)
  const Icon = content.icon
  return (
    <div className="flex max-w-2xl gap-3 border border-border bg-background p-4" role="status">
      <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
      <div>
        <p className="font-semibold text-sm">{content.title}</p>
        <p className="mt-1 text-muted text-xs leading-5">{content.description}</p>
      </div>
    </div>
  )
}

function getAccessExplanation(mode: SiteAccessMode) {
  if (mode === 'private')
    return {
      icon: LockKeyhole,
      title: 'The cloud check stays off',
      description:
        'After setup, connect the CodeRocket runner from GitHub or your own environment. Your normal account password is not stored in CodeRocket.'
    }
  if (mode === 'protected')
    return {
      icon: ShieldCheck,
      title: 'We start with a safe access test',
      description:
        'If Cloudflare or another protection returns a challenge, the result will say Check incomplete and show the private-runner option.'
    }
  return {
    icon: Cloud,
    title: 'No installation needed',
    description:
      'CodeRocket opens only the pages you selected and starts the first public check immediately.'
  }
}
