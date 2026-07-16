import { ImageResponse } from 'next/og'

export const alt = 'CodeRocket — Know when your website needs attention.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** Generate the canonical CodeRocket social image from the current product promise. */
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: 'stretch',
        background: '#09090b',
        color: '#fafafa',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'sans-serif',
        height: '100%',
        justifyContent: 'space-between',
        padding: '70px 86px',
        width: '100%'
      }}
    >
      <div style={{ alignItems: 'center', display: 'flex', fontSize: 34, gap: 18 }}>
        <svg fill="none" height="58" viewBox="-7 1 70 70" width="58">
          <path
            d="M24 4C17 12.5 13 22 12 31l-8 8c-1.2 1.2-1.2 2.4 0 3.7 4.8 5.2 10.2 9.6 16 13.3-3.7-7.2-6-13-6-17 0-1.6.7-3 2-4.2l4-3.8c.5-5.8 1.8-10.8 4-15 2.2 4.2 3.5 9.2 4 15l4 3.8c1.3 1.2 2 2.6 2 4.2 0 4-2.3 9.8-6 17 5.8-3.7 11.2-8.1 16-13.3 1.2-1.3 1.2-2.5 0-3.7l-8-8c-1-9-5-18.5-12-27Z"
            fill="#fafafa"
            transform="translate(8 8) rotate(45 24 24)"
          />
        </svg>
        <span style={{ fontWeight: 650 }}>CodeRocket</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'serif', fontSize: 86 }}>
        <span>Know when your website</span>
        <span style={{ fontStyle: 'italic' }}>needs attention.</span>
      </div>
      <div
        style={{ alignItems: 'center', color: '#a1a1aa', display: 'flex', fontSize: 22, gap: 18 }}
      >
        <span style={{ background: '#22d3ee', height: 12, width: 12 }} />
        WEBSITE HEALTH MONITORING
      </div>
    </div>,
    size
  )
}
