import { CodeRocketLogo } from '@repo/design-system/coderocket-logo'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Playfair_Display } from 'next/font/google'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { MarketingAccountActions } from '@/components/marketing-account-actions'
import { MarketingChrome } from '@/components/marketing-chrome'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist'
})
const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono'
})
const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair-display',
  weight: ['400', '500']
})

export const metadata: Metadata = {
  metadataBase: new URL('https://coderocket.app'),
  title: {
    default: 'CodeRocket — Frontend quality, cleared for launch.',
    template: '%s — CodeRocket'
  },
  description: 'Continuous frontend quality gates for freelancers and agencies.',
  manifest: '/manifest.webmanifest',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'CodeRocket',
    description: 'Frontend quality, cleared for launch.',
    url: 'https://coderocket.app',
    siteName: 'CodeRocket',
    images: [{ url: '/social-card.png', width: 1200, height: 630 }],
    type: 'website'
  }
}

export const viewport: Viewport = { colorScheme: 'light dark', themeColor: '#0B1020' }

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      className={`${geist.variable} ${geistMono.variable} ${playfairDisplay.variable}`}
      lang="en"
    >
      <body>
        <MarketingChrome>
          <header className="sticky top-0 z-50 border-border border-b bg-background">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
              <Link aria-label="CodeRocket home" href="/">
                <CodeRocketLogo
                  className="h-8 w-8 shrink-0 -translate-y-px text-foreground"
                  wordmarkClassName="text-sm"
                />
              </Link>
              <nav
                aria-label="Primary navigation"
                className="flex items-center gap-4 font-mono text-xs sm:gap-7"
              >
                <Link
                  className="hidden text-muted hover:text-foreground sm:inline"
                  href="/#product"
                >
                  How it works
                </Link>
                <Link className="text-muted hover:text-foreground" href="/pricing">
                  Pricing
                </Link>
                <Link className="hidden text-muted hover:text-foreground sm:inline" href="/docs">
                  Docs
                </Link>
                <MarketingAccountActions />
              </nav>
            </div>
          </header>
        </MarketingChrome>
        {children}
        <MarketingChrome>
          <footer className="border-border border-t px-5 py-14 text-muted text-sm">
            <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-[1fr_auto]">
              <div>
                <CodeRocketLogo
                  className="h-7 w-7 shrink-0 text-foreground"
                  wordmarkClassName="text-foreground"
                />
                <p className="mt-4 max-w-sm">Frontend quality, cleared for launch.</p>
              </div>
              <div className="grid grid-cols-2 gap-x-12 gap-y-3 font-mono text-xs">
                <Link href="/pricing">pricing</Link>
                <Link href="/legal/privacy">privacy</Link>
                <Link href="/docs/cli">github & cli</Link>
                <Link href="/legal/terms">terms</Link>
                <Link href="/docs/rules">rules reference</Link>
                <span>© {new Date().getFullYear()}</span>
              </div>
            </div>
          </footer>
        </MarketingChrome>
      </body>
    </html>
  )
}
