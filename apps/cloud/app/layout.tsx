import { CODEROCKET_TAGLINE, CodeRocketLogo } from '@repo/design-system/coderocket-logo'
import { CodeRocketToaster } from '@repo/design-system/ui/coderocket-toast'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Playfair_Display } from 'next/font/google'
import Link from 'next/link'
import { type ReactNode, Suspense } from 'react'
import { MarketingAccountActions } from '@/components/marketing-account-actions'
import { MarketingChrome } from '@/components/marketing-chrome'
import { MarketingFooter } from '@/components/marketing-footer'
import { MarketingNavigationLinks } from '@/components/marketing-navigation-links'
import { NavigationFeedback } from '@/components/navigation-feedback'
import { RouteToasts } from '@/components/route-toasts'
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_SOCIAL_IMAGE,
  PUBLIC_ROBOTS,
  SITE_NAME,
  SITE_URL
} from '@/lib/seo'
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
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'CodeRocket — Website health monitoring',
    template: '%s — CodeRocket'
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'technology',
  referrer: 'origin-when-cross-origin',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }]
  },
  openGraph: {
    title: 'CodeRocket — Website health monitoring',
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: DEFAULT_SOCIAL_IMAGE,
        width: 1200,
        height: 630,
        alt: 'CodeRocket website health monitoring'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CodeRocket — Website health monitoring',
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_SOCIAL_IMAGE]
  },
  robots: PUBLIC_ROBOTS,
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined
}

export const viewport: Viewport = { colorScheme: 'light dark', themeColor: '#0B1020' }

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      className={`${geist.variable} ${geistMono.variable} ${playfairDisplay.variable}`}
      data-scroll-behavior="smooth"
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
          <MarketingFooter />
        </MarketingChrome>
      </body>
    </html>
  )
}
