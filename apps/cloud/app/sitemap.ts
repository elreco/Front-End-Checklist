import type { MetadataRoute } from 'next'
import { DOCUMENTATION_RULES, getRuleDocumentationUrl } from '@/lib/docs'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    '',
    '/pricing',
    '/login',
    '/docs',
    '/docs/audits',
    '/docs/cli',
    '/docs/rules',
    '/docs/security'
  ]
  const staticEntries: MetadataRoute.Sitemap = staticPaths.map(path => ({
    url: `https://coderocket.app${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.7
  }))
  const ruleEntries: MetadataRoute.Sitemap = DOCUMENTATION_RULES.map(rule => ({
    url: `https://coderocket.app${getRuleDocumentationUrl(rule)}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.6
  }))
  return [...staticEntries, ...ruleEntries]
}
