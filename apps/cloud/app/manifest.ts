import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CodeRocket',
    short_name: 'CodeRocket',
    description:
      'Clone, edit, and publish a website from a public URL or Figma design without opening a code editor.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    orientation: 'any',
    background_color: '#09090B',
    theme_color: '#7C5CFC',
    categories: ['business', 'developer tools', 'productivity'],
    lang: 'en',
    icons: [
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  }
}
