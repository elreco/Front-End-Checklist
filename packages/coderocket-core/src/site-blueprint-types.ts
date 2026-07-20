import type { SiteSourceBlueprint } from './site-document'

export type SiteViewportName = 'desktop' | 'tablet' | 'mobile'

export interface SiteViewportDefinition {
  height: number
  name: SiteViewportName
  width: number
}

export interface SiteViewportCapture extends SiteViewportDefinition {
  dataUrl: string
}

export interface SiteCaptureStudy {
  blueprint: SiteSourceBlueprint
  captures: SiteViewportCapture[]
}

export const SITE_CAPTURE_VIEWPORTS: SiteViewportDefinition[] = [
  { name: 'desktop', width: 1440, height: 1600 },
  { name: 'tablet', width: 768, height: 1400 },
  { name: 'mobile', width: 390, height: 1200 }
]
