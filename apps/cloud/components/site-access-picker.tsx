import type { SiteAccessMode } from '@coderocket/core'
import { Cloud, LockKeyhole } from '@repo/design-system/icons'

const options = [
  {
    value: 'public',
    icon: Cloud,
    title: 'No sign-in is required',
    description:
      'Choose this when the selected pages open in a private browser window. A CDN or firewall is fine if it allows normal access.',
    badge: 'Automatic'
  },
  {
    value: 'private',
    icon: LockKeyhole,
    title: 'Sign-in or private access is required',
    description:
      'Choose this for customer accounts, private previews, access headers, or an internal network.',
    badge: 'CI setup'
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
    <div className="grid gap-3 md:grid-cols-2">
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

/** Describe what the selected reachability contract changes operationally. */
function getAccessExplanation(mode: SiteAccessMode) {
  if (mode === 'private')
    return {
      icon: LockKeyhole,
      title: 'We will guide you through CI setup',
      description:
        'Run the same HTML check from GitHub, GitLab, Bitbucket, or another environment that already has access. CodeRocket does not store your website password.'
    }
  return {
    icon: Cloud,
    title: 'We will verify access automatically',
    description:
      'CodeRocket will request the selected pages and analyze the HTML returned by the website. It does not inspect your repository or pretend to identify your protection provider.'
  }
}
