import type { Metadata } from 'next'
import { BuilderMarketing } from '@/components/builder-marketing'
import { JsonLd } from '@/components/json-ld'
import { absoluteUrl, createPublicMetadata, SITE_NAME, SITE_URL, SUPPORT_EMAIL } from '@/lib/seo'

const homeTitle = 'CodeRocket — Clone a website without code'
const homeDescription =
  'Paste a website address and turn the visible experience into a safe, editable, hosted website. Built for people who do not code.'

export const metadata: Metadata = createPublicMetadata({
  title: homeTitle,
  absoluteTitle: true,
  description: homeDescription,
  path: '/',
  keywords: [
    'clone website without code',
    'AI website builder',
    'no-code website recreation',
    'website importer',
    'website builder for beginners'
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
      description: homeDescription,
      inLanguage: 'en',
      publisher: { '@id': `${SITE_URL}/#organization` }
    }
  ]
}

export default function HomePage() {
  return (
    <main>
      <JsonLd data={homeStructuredData} />
      <BuilderMarketing />
    </main>
  )
}
