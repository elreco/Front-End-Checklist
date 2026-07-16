import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CodeRocket',
    short_name: 'CodeRocket',
    description: 'Frontend quality, cleared for launch.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090B',
    theme_color: '#7C5CFC',
    icons: [
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  }
}
