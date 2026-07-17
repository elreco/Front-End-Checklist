export { type AuditPageOptions, auditPage, getRulesetVersion, type PageAuditResult } from './audit'
export {
  PRODUCTION_HTML_RULE_SLUGS,
  selectProductionHtmlRules
} from './automation-profile'
export { compareFindings, fingerprintFinding, normalizeAuditPath } from './diff'
export { getPlanEntitlements, PLAN_ENTITLEMENTS } from './plans'
export {
  buildProjectPageUrl,
  deriveSiteAccessMode,
  normalizeAuthenticatedPagePaths,
  normalizeHttpsOrigin,
  normalizeProjectPagePath,
  normalizeProjectPagePaths
} from './project-pages'
export {
  assertPublicHttpsUrl,
  fetchPublicHtml,
  fetchPublicText,
  probePublicImage,
  type SafeFetchOptions,
  type SafeHtmlResponse,
  type SafeTextResponse
} from './safe-fetch'
export { auditSubmissionSchema, type ValidAuditSubmission } from './schemas'
export { auditSiteInfrastructure } from './site-infrastructure'
export { extractSocialImageUrl, resolveProjectSocialImage } from './social-metadata'
export type {
  AuditComparison,
  AuditEnvironment,
  AuditFinding,
  AuditFindingInput,
  AuditStatus,
  AuditSubmission,
  AuditTrigger,
  CheckProgressStage,
  FindingCategory,
  FindingEvidence,
  FindingEvidenceKind,
  FindingPriority,
  FindingSource,
  FindingStatus,
  GateStatus,
  PageAccessMode,
  PlanEntitlements,
  PlanId,
  SiteAccessMode
} from './types'
