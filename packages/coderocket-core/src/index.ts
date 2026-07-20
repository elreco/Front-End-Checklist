export { type AuditPageOptions, auditPage, getRulesetVersion, type PageAuditResult } from './audit'
export {
  PRODUCTION_HTML_RULE_SLUGS,
  selectProductionHtmlRules
} from './automation-profile'
export { compareFindings, fingerprintFinding, normalizeAuditPath } from './diff'
export { createDocumentProof } from './document-proof'
export {
  type DiscoveredPage,
  discoverPublicPagePaths,
  discoverRenderedPagePaths,
  type PageDiscoverySource,
  type PublicPageDiscovery
} from './page-discovery'
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
export {
  BUILDER_CREDIT_COSTS,
  createSiteBundleDocument,
  createSiteDocument,
  getBuilderPlanEntitlements,
  type SiteDocument,
  type SiteDocumentPage,
  type SiteGoal,
  type SiteSourceBlueprint,
  type SiteSourceMode,
  type SourceContentItem,
  type SourceSectionBlueprint,
  siteDocumentSchema
} from './site-document'
export {
  applySiteEditPlan,
  type SiteEditPlan,
  type SiteEditSelection,
  siteEditPlanSchema,
  siteEditSelectionSchema
} from './site-edit'
export { auditSiteInfrastructure } from './site-infrastructure'
export {
  pageTemplate,
  type RepresentativePageTarget,
  selectRepresentativePageTargets
} from './site-page-selection'
export {
  extractSiteImageUrls,
  extractSocialImageUrl,
  resolveProjectSocialImage
} from './social-metadata'
export type {
  AuditComparison,
  AuditEnvironment,
  AuditFinding,
  AuditFindingInput,
  AuditStatus,
  AuditSubmission,
  AuditTrigger,
  CheckProgressStage,
  DocumentProof,
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
