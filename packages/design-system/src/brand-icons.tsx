import {
  SiBitbucket,
  SiCalendly,
  SiClaude,
  SiFacebook,
  SiGithub,
  SiGitlab,
  SiGoogle,
  SiShopify,
  SiStripe,
  SiSupabase,
  SiX,
  SiYoutube
} from '@icons-pack/react-simple-icons'
import type { ComponentPropsWithoutRef } from 'react'

type BrandIconProps = Omit<ComponentPropsWithoutRef<typeof SiX>, 'title'>

/** Wrap one official brand glyph with the shared decorative icon contract. */
function createBrandIcon(Icon: typeof SiX) {
  return (props: BrandIconProps) => <Icon aria-hidden="true" {...props} />
}

const BitbucketBrandIcon = createBrandIcon(SiBitbucket)
const ClaudeBrandIcon = createBrandIcon(SiClaude)
const FacebookBrandIcon = createBrandIcon(SiFacebook)
const GitHubBrandIcon = createBrandIcon(SiGithub)
const GitLabBrandIcon = createBrandIcon(SiGitlab)
const GoogleBrandIcon = createBrandIcon(SiGoogle)
const ShopifyBrandIcon = createBrandIcon(SiShopify)
const StripeBrandIcon = createBrandIcon(SiStripe)
const SupabaseBrandIcon = createBrandIcon(SiSupabase)
const CalendlyBrandIcon = createBrandIcon(SiCalendly)
const XBrandIcon = createBrandIcon(SiX)
const YouTubeBrandIcon = createBrandIcon(SiYoutube)

export {
  BitbucketBrandIcon,
  CalendlyBrandIcon,
  ClaudeBrandIcon,
  FacebookBrandIcon,
  GitHubBrandIcon,
  GitLabBrandIcon,
  GoogleBrandIcon,
  ShopifyBrandIcon,
  StripeBrandIcon,
  SupabaseBrandIcon,
  XBrandIcon,
  YouTubeBrandIcon
}
