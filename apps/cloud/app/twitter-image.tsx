import { createSocialImage, SOCIAL_IMAGE_SIZE } from '@/lib/social-image'

export const alt = 'CodeRocket — Know when your website needs attention.'
export const size = SOCIAL_IMAGE_SIZE
export const contentType = 'image/png'

/** Generate the default CodeRocket large card for X. */
export default function TwitterImage() {
  return createSocialImage({
    headline: 'Know when your website',
    accent: 'needs attention.',
    kicker: 'Website health monitoring'
  })
}
