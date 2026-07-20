import { createSocialImage, SOCIAL_IMAGE_SIZE } from '@/lib/social-image'

export const alt = 'CodeRocket pricing — Website monitoring that scales with you.'
export const size = SOCIAL_IMAGE_SIZE
export const contentType = 'image/png'

/** Generate the pricing Open Graph image. */
export default function PricingOpenGraphImage() {
  return createSocialImage({
    headline: 'Website monitoring',
    accent: 'that scales with you.',
    kicker: 'Free · Launch · Studio'
  })
}
