import { CODEROCKET_TAGLINE, CodeRocketLogo } from '@repo/design-system/coderocket-logo'
import Link from 'next/link'
import { SUPPORT_EMAIL } from '@/lib/seo'
import { CookieSettingsButton } from './google-analytics-consent'

const footerGroups = [
  {
    title: 'Product',
    links: [
      { href: '/create', label: 'Clone a website' },
      { href: '/', label: 'Website builder' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/monitoring', label: 'Website health tools' }
    ]
  },
  {
    title: 'Resources',
    links: [
      { href: '/docs', label: 'Documentation' },
      { href: '/docs/rules', label: 'Rules reference' },
      { href: '/docs/cli', label: 'Protected site access' },
      { href: '/docs/security', label: 'Security model' }
    ]
  },
  {
    title: 'Company',
    links: [
      { href: '/support', label: 'Support' },
      { href: `mailto:${SUPPORT_EMAIL}`, label: SUPPORT_EMAIL }
    ]
  },
  {
    title: 'Legal',
    links: [
      { href: '/legal/privacy', label: 'Privacy' },
      { href: '/legal/terms', label: 'Terms' },
      { href: '/legal/cookies', label: 'Cookies' },
      { href: '/legal/notices', label: 'Legal notice' }
    ]
  }
]

/** Shared marketing footer with product, support, and legal navigation. */
export function MarketingFooter() {
  return (
    <footer className="border-border border-t bg-surface px-5 py-14 text-sm sm:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 border-border border-b pb-12 lg:grid-cols-[1.15fr_2fr]">
          <div>
            <Link aria-label="CodeRocket home" className="inline-flex" href="/">
              <CodeRocketLogo
                className="h-11 w-11 shrink-0 text-foreground"
                tagline={CODEROCKET_TAGLINE}
                taglineClassName="text-muted"
                wordmarkClassName="text-xl text-foreground"
              />
            </Link>
            <p className="mt-5 max-w-sm text-muted leading-7">
              Clone, edit, and publish a website without code. Optional health tools remain
              available when an existing site needs ongoing checks.
            </p>
          </div>

          <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {footerGroups.map(group => (
              <div key={group.title}>
                <h2 className="font-mono text-foreground text-xs uppercase tracking-[.15em]">
                  {group.title}
                </h2>
                <ul className="mt-4 space-y-3">
                  {group.links.map(link => (
                    <li key={link.href}>
                      <Link
                        className="break-words text-muted transition-colors hover:text-signal"
                        href={link.href}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-3 pt-6 font-mono text-muted text-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p>© {new Date().getFullYear()} CodeRocket. All rights reserved.</p>
            <CookieSettingsButton
              className="font-mono text-muted text-xs hover:text-signal"
              compact
            />
          </div>
          <p>Frontend quality, cleared for launch.</p>
        </div>
      </div>
    </footer>
  )
}
