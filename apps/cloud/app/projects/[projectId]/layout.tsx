import type { ReactNode } from 'react'
import { createPrivateMetadata } from '@/lib/seo'

export const metadata = createPrivateMetadata('Monitored website')

/** Apply private-page metadata to every project detail route. */
export default function ProjectLayout({ children }: { children: ReactNode }) {
  return children
}
