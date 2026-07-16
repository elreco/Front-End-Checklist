import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/projects', '/audits', '/settings', '/reports']
    },
    sitemap: 'https://coderocket.app/sitemap.xml',
    host: 'https://coderocket.app'
  }
}
