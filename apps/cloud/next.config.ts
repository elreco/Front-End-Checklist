import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  transpilePackages: [
    '@coderocket/ai',
    '@coderocket/core',
    '@coderocket/db',
    '@repo/design-system'
  ],
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
        '/create/:path*',
        '/dashboard/:path*',
        '/login/:path*',
        '/recover/:path*',
        '/settings/:path*',
        '/studio/:path*',
        '/websites/:path*'
      ].map(source => ({
        source,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }]
      }))
    ]
  }
}

export default nextConfig
