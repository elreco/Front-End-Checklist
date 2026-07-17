import { createSocialImage, SOCIAL_IMAGE_SIZE } from '@/lib/social-image'

export const alt = 'CodeRocket documentation — The official website health reference.'
export const size = SOCIAL_IMAGE_SIZE
export const contentType = 'image/png'

/** Generate the documentation Open Graph image. */
export default function DocumentationOpenGraphImage() {
  return createSocialImage({
    headline: 'The official website',
    accent: 'health reference.',
    kicker: 'Synced Front-End Checklist rules'
  })
}
