import { createSocialImage, SOCIAL_IMAGE_SIZE } from '@/lib/social-image'

export const alt = 'CodeRocket pricing — Clone, edit, and publish websites without code.'
export const size = SOCIAL_IMAGE_SIZE
export const contentType = 'image/png'

/** Generate the pricing Open Graph image. */
export default function PricingOpenGraphImage() {
  return createSocialImage({
    headline: 'Clone and publish',
    accent: 'without code.',
    kicker: 'Free · Launch · Studio'
  })
}
