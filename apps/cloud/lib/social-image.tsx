import { ImageResponse } from 'next/og'

export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 }

interface SocialImageOptions {
  accent: string
  headline: string
  kicker: string
}

/** Build a high-contrast CodeRocket social card for Open Graph and X. */
export function createSocialImage({ accent, headline, kicker }: SocialImageOptions) {
  return new ImageResponse(
    <div
      style={{
        background: '#09090b',
        color: '#fafafa',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'space-between',
        padding: '64px 76px',
        width: '100%'
      }}
    >
      <div style={{ alignItems: 'center', display: 'flex', fontSize: 30, gap: 18 }}>
        <div
          style={{
            alignItems: 'center',
            border: '1px solid #3f3f46',
            display: 'flex',
            height: 64,
            justifyContent: 'center',
            width: 64
          }}
        >
          <svg fill="none" height="48" viewBox="-7 1 70 70" width="48">
            <path
              d="M24 4C17 12.5 13 22 12 31l-8 8c-1.2 1.2-1.2 2.4 0 3.7 4.8 5.2 10.2 9.6 16 13.3-3.7-7.2-6-13-6-17 0-1.6.7-3 2-4.2l4-3.8c.5-5.8 1.8-10.8 4-15 2.2 4.2 3.5 9.2 4 15l4 3.8c1.3 1.2 2 2.6 2 4.2 0 4-2.3 9.8-6 17 5.8-3.7 11.2-8.1 16-13.3 1.2-1.3 1.2-2.5 0-3.7l-8-8c-1-9-5-18.5-12-27Z"
              fill="#fafafa"
              transform="translate(8 8) rotate(45 24 24)"
            />
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 32, fontWeight: 650 }}>CodeRocket</span>
          <span style={{ color: '#a1a1aa', fontFamily: 'monospace', fontSize: 15 }}>
            Website health.
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'serif' }}>
        <span style={{ fontSize: 80, letterSpacing: '-3px', lineHeight: 1 }}>{headline}</span>
        <span
          style={{ color: '#fafafa', fontSize: 80, fontStyle: 'italic', letterSpacing: '-3px' }}
        >
          {accent}
        </span>
      </div>

      <div
        style={{
          alignItems: 'center',
          borderTop: '1px solid #27272a',
          color: '#a1a1aa',
          display: 'flex',
          fontFamily: 'monospace',
          fontSize: 18,
          gap: 14,
          paddingTop: 24,
          textTransform: 'uppercase'
        }}
      >
        <span style={{ background: '#22d3ee', height: 10, width: 10 }} />
        {kicker}
      </div>
    </div>,
    SOCIAL_IMAGE_SIZE
  )
}
