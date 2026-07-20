import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: Array<{
    changeFrequency: 'monthly' | 'weekly' | 'yearly'
    path: string
    priority: number
  }> = [
    { path: '', changeFrequency: 'weekly', priority: 1 },
    { path: '/pricing', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/integrations', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/support', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/legal/privacy', changeFrequency: 'yearly', priority: 0.2 },
    { path: '/legal/terms', changeFrequency: 'yearly', priority: 0.2 },
    { path: '/legal/cookies', changeFrequency: 'yearly', priority: 0.2 },
    { path: '/legal/notices', changeFrequency: 'yearly', priority: 0.2 }
  ]
  const staticEntries: MetadataRoute.Sitemap = staticPages.map(entry => ({
    url: `${SITE_URL}${entry.path}`,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority
  }))
  return staticEntries
}
