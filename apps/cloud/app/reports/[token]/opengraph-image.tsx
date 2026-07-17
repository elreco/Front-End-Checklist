import { notFound } from 'next/navigation'
import { getSharedReport } from '@/lib/shared-report-data'
import { createSocialImage } from '@/lib/social-image'
import { getWebsiteLevelPresentation } from '@/lib/website-level-presentation'

export const alt = 'CodeRocket shared website health report'
export const contentType = 'image/png'
export const size = { height: 630, width: 1200 }

/** Render the exact shared level into an Open Graph card without exposing report findings. */
export default async function SharedReportImage({
  params
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const report = await getSharedReport(token)
  if (!report) notFound()
  const level = getWebsiteLevelPresentation(report.level.level)
  return createSocialImage({
    headline: report.project.name,
    accent: `${level.label} website level`,
    kicker: `${report.audit.checkedPages}/${report.audit.requestedPages} selected pages checked`
  })
}
