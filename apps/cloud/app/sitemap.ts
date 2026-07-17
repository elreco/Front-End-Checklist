import type { MetadataRoute } from 'next'
import { DOCUMENTATION_RULES, getRuleDocumentationUrl } from '@/lib/docs'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: Array<{
    changeFrequency: 'monthly' | 'weekly' | 'yearly'
    path: string
    priority: number
  }> = [
    { path: '', changeFrequency: 'weekly', priority: 1 },
    { path: '/pricing', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/docs', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/docs/audits', changeFrequency: 'monthly', priority: 0.75 },
    { path: '/docs/ai', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/docs/cli', changeFrequency: 'monthly', priority: 0.75 },
    { path: '/docs/rules', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/docs/security', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/support', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/legal/privacy', changeFrequency: 'yearly', priority: 0.2 },
    { path: '/legal/terms', changeFrequency: 'yearly', priority: 0.2 },
    { path: '/legal/cookies', changeFrequency: 'yearly', priority: 0.2 },
    { path: '/legal/notices', changeFrequency: 'yearly', priority: 0.2 }
  ]
  const staticEntries: MetadataRoute.Sitemap = staticPages.map(entry => ({
    url: `https://coderocket.app${entry.path}`,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority
  }))
  const ruleEntries: MetadataRoute.Sitemap = DOCUMENTATION_RULES.map(rule => ({
    url: `https://coderocket.app${getRuleDocumentationUrl(rule)}`,
    changeFrequency: 'monthly',
    priority: 0.6
  }))
  return [...staticEntries, ...ruleEntries]
}
