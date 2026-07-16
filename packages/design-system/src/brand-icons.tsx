import {
  SiClaude,
  SiFacebook,
  SiGithub,
  SiGoogle,
  SiX,
  SiYoutube
} from '@icons-pack/react-simple-icons'
import type { ComponentPropsWithoutRef } from 'react'

type BrandIconProps = Omit<ComponentPropsWithoutRef<typeof SiX>, 'title'>

/**
 * Official Claude brand icon from Simple Icons.
 */
export function ClaudeBrandIcon(props: BrandIconProps) {
  return <SiClaude aria-hidden="true" {...props} />
}

/**
 * Official GitHub brand icon from Simple Icons.
 */
export function GitHubBrandIcon(props: BrandIconProps) {
  return <SiGithub aria-hidden="true" {...props} />
}

/** Official Google brand icon from Simple Icons. */
export function GoogleBrandIcon(props: BrandIconProps) {
  return <SiGoogle aria-hidden="true" {...props} />
}

/** Official Facebook brand icon from Simple Icons. */
export function FacebookBrandIcon(props: BrandIconProps) {
  return <SiFacebook aria-hidden="true" {...props} />
}

/**
 * Official X brand icon from Simple Icons.
 */
export function XBrandIcon(props: BrandIconProps) {
  return <SiX aria-hidden="true" {...props} />
}

/**
 * Official YouTube brand icon from Simple Icons.
 */
export function YouTubeBrandIcon(props: BrandIconProps) {
  return <SiYoutube aria-hidden="true" {...props} />
}
