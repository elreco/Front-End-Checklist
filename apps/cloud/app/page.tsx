import type { Metadata } from 'next'
import { JsonLd } from '@/components/json-ld'
import { Benefits, Hero } from '@/components/marketing'
import {
  absoluteUrl,
  createPublicMetadata,
  DEFAULT_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  SUPPORT_EMAIL
} from '@/lib/seo'

const homeTitle = 'CodeRocket — Website health monitoring'

export const metadata: Metadata = createPublicMetadata({
  title: homeTitle,
  absoluteTitle: true,
  description: DEFAULT_DESCRIPTION,
  path: '/',
  keywords: [
    'website health monitoring',
    'website quality monitoring',
    'frontend monitoring',
    'website accessibility checker',
    'technical SEO monitoring',
    'website security checks',
    'frontend regression detection'
  ]
})

const homeStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: absoluteUrl('/apple-icon.png'),
      email: SUPPORT_EMAIL,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: SUPPORT_EMAIL,
        url: absoluteUrl('/support'),
        availableLanguage: ['English', 'French']
      }
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      description: DEFAULT_DESCRIPTION,
      inLanguage: 'en',
      publisher: { '@id': `${SITE_URL}/#organization` }
    }
  ]
}

export default function HomePage() {
  return (
    <main>
      <JsonLd data={homeStructuredData} />
      <Hero />
      <Benefits />
    </main>
  )
}
