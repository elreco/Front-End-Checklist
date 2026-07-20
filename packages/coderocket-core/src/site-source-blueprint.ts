import type { SourceFormBlueprint } from './site-form'
import type { SiteSectionVisualStyle, SiteVisualTheme } from './site-visual-style'

export type SiteSourceMode = 'owned' | 'inspiration'
export type SiteGoal = 'contact' | 'booking' | 'sell' | 'present'

export interface SourceLink {
  href: string
  label: string
  prominent?: boolean
}

export interface SourceContentItem {
  body: string
  imageAlt?: string
  imageUrl?: string
  links: SourceLink[]
  price?: string
  title: string
}

export interface SourceSectionBlueprint {
  backgroundColor: string
  body: string
  foregroundColor: string
  heading: string
  imageAlt?: string
  imageMobileWidth?: number
  imageUrl?: string
  imageWidth?: number
  items?: SourceContentItem[]
  layout?: 'centered' | 'split' | 'stacked'
  links: SourceLink[]
  form?: SourceFormBlueprint
  visual?: SiteSectionVisualStyle
}

export interface SiteSourceBlueprint {
  accentColor: string
  backgroundColor: string
  brandName: string
  capturedAt: string
  description: string
  footerLinks?: SourceLink[]
  footerText?: string
  foregroundColor: string
  headerBrandVisible?: boolean
  logoUrl?: string
  navigation: SourceLink[]
  sections: SourceSectionBlueprint[]
  sourceUrl: string
  title: string
  visualAnalysis?: 'responsive-ai' | 'responsive-dom'
  visualTheme?: SiteVisualTheme
}
