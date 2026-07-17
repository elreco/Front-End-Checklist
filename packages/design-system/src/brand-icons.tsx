import {
  SiBitbucket,
  SiClaude,
  SiFacebook,
  SiGithub,
  SiGitlab,
  SiGoogle,
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
const XBrandIcon = createBrandIcon(SiX)
const YouTubeBrandIcon = createBrandIcon(SiYoutube)

export {
  BitbucketBrandIcon,
  ClaudeBrandIcon,
  FacebookBrandIcon,
  GitHubBrandIcon,
  GitLabBrandIcon,
  GoogleBrandIcon,
  XBrandIcon,
  YouTubeBrandIcon
}
