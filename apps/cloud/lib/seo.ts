import type { Metadata } from 'next'

export const SITE_NAME = 'CodeRocket'
export const SITE_URL = 'https://www.coderocket.app'
export const SUPPORT_EMAIL = 'contact@coderocket.app'
export const DEFAULT_DESCRIPTION =
  'Monitor website availability, search visibility, accessibility, speed, security, and frontend quality. See what changed and what needs attention.'
export const DEFAULT_SOCIAL_IMAGE = '/opengraph-image'

export const PUBLIC_ROBOTS: Metadata['robots'] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1
  }
}

interface PublicMetadataOptions {
  title: string
  description: string
  path: string
  absoluteTitle?: boolean
  image?: string
  keywords?: string[]
  type?: 'article' | 'website'
}

/** Build consistent, self-referencing metadata for an indexable CodeRocket page. */
export function createPublicMetadata({
  absoluteTitle = false,
  description,
  image = DEFAULT_SOCIAL_IMAGE,
  keywords,
  path,
  title,
  type = 'website'
}: PublicMetadataOptions): Metadata {
  const normalizedPath = path === '/' ? '/' : `/${path.replace(/^\/+|\/+$/g, '')}`
  const socialTitle = absoluteTitle ? title : `${title} — ${SITE_NAME}`
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords,
    alternates: { canonical: normalizedPath },
    openGraph: {
      title: socialTitle,
      description,
      url: normalizedPath,
      siteName: SITE_NAME,
      locale: 'en_US',
      type,
      images: [{ url: image, width: 1200, height: 630, alt: `${socialTitle} social preview` }]
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: [image]
    },
    robots: PUBLIC_ROBOTS
  }
}

/** Prevent account, app, and tokenized pages from becoming search results. */
export function createPrivateMetadata(title: string): Metadata {
  return {
    title,
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false, noimageindex: true }
    }
  }
}

/** Return an absolute URL on the canonical CodeRocket origin. */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString()
}
