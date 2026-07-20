import { createSocialImage, SOCIAL_IMAGE_SIZE } from '@/lib/social-image'

export const alt = 'CodeRocket — Know when your website needs attention.'
export const size = SOCIAL_IMAGE_SIZE
export const contentType = 'image/png'

/** Generate the default CodeRocket Open Graph image. */
export default function OpenGraphImage() {
  return createSocialImage({
    headline: 'Clone a website.',
    accent: 'Make it yours.',
    kicker: 'No-code website creation'
  })
}
