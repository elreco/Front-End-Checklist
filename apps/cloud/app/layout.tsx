import { CODEROCKET_TAGLINE, CodeRocketLogo } from '@repo/design-system/coderocket-logo'
import { CodeRocketToaster } from '@repo/design-system/ui/coderocket-toast'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Playfair_Display } from 'next/font/google'
import Link from 'next/link'
import { type ReactNode, Suspense } from 'react'
import { MarketingAccountActions } from '@/components/marketing-account-actions'
import { MarketingChrome } from '@/components/marketing-chrome'
import { MarketingNavigationLinks } from '@/components/marketing-navigation-links'
import { NavigationFeedback } from '@/components/navigation-feedback'
import { RouteToasts } from '@/components/route-toasts'
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
    default: 'CodeRocket — Website health monitoring',
    template: '%s — CodeRocket'
  },
  description:
    'Know when your website needs attention. Monitor availability, search, accessibility, performance, security, and frontend quality.',
  manifest: '/manifest.webmanifest',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'CodeRocket',
    description: 'Know when your website needs attention.',
    url: 'https://coderocket.app',
    siteName: 'CodeRocket',
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
        <a
          className="fixed top-3 left-3 z-[100] -translate-y-24 bg-accent px-4 py-2 font-mono text-accent-foreground text-sm focus:translate-y-0"
          href="#main-content"
        >
          Skip to main content
        </a>
        <Suspense fallback={null}>
          <NavigationFeedback />
          <RouteToasts />
        </Suspense>
        <CodeRocketToaster />
        <MarketingChrome>
          <header className="sticky top-0 z-50 border-border border-b bg-background">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
              <Link aria-label="CodeRocket home" href="/">
                <CodeRocketLogo
                  className="h-10 w-10 shrink-0 text-foreground"
                  tagline={CODEROCKET_TAGLINE}
                  wordmarkClassName="text-xl"
                />
              </Link>
              <nav
                aria-label="Primary navigation"
                className="flex items-center gap-4 font-mono text-xs sm:gap-7"
              >
                <MarketingNavigationLinks />
                <MarketingAccountActions />
              </nav>
            </div>
          </header>
        </MarketingChrome>
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
        <MarketingChrome>
          <footer className="border-border border-t px-5 py-14 text-muted text-sm">
            <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-[1fr_auto]">
              <div>
                <CodeRocketLogo
                  className="h-9 w-9 shrink-0 text-foreground"
                  tagline={CODEROCKET_TAGLINE}
                  taglineClassName="text-muted"
                  wordmarkClassName="text-base text-foreground"
                />
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
