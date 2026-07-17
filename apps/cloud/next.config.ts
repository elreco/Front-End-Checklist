import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  transpilePackages: [
    '@coderocket/ai',
    '@coderocket/core',
    '@coderocket/db',
    '@frontendchecklist/rules',
    '@repo/design-system'
  ],
  async redirects() {
    return [
      {
        source: '/legacy/:path*',
        destination: '/gone',
        permanent: false
      }
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
        ]
      },
      ...[
        '/audits/:path*',
        '/dashboard/:path*',
        '/login/:path*',
        '/onboarding/:path*',
        '/projects/:path*',
        '/recover/:path*',
        '/reports/:path*',
        '/settings/:path*'
      ].map(source => ({
        source,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }]
      }))
    ]
  }
}

export default nextConfig
