import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import type {
  FrontendChecklistCategory,
  FrontendChecklistPriority,
  FrontendChecklistRelatedRule,
  FrontendChecklistRule,
  FrontendChecklistRulePrompts,
  FrontendChecklistRuleSource,
  FrontendChecklistSubcategory
} from './types.js'
import { RULE_CATEGORIES, RULE_SUBCATEGORIES } from './types.js'

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url))

interface RulesDirectoryOptions {
  moduleDirectory?: string
  workingDirectory?: string
}

/** Check whether an unknown value is a plain object. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Read a non-empty string from a parsed YAML object. */
function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

/** Read a finite number from a parsed YAML object. */
function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** Read a string array from a parsed YAML object. */
function readStringArray(record: Record<string, unknown>, key: string): string[] | undefined {
  const value = record[key]
  if (!Array.isArray(value)) return undefined

  const strings = value.filter((item): item is string => typeof item === 'string')
  return strings.length > 0 ? strings : undefined
}

/** Check whether a string is a supported rule priority. */
function isRulePriority(value: string): value is FrontendChecklistPriority {
  return value === 'critical' || value === 'high' || value === 'medium' || value === 'low'
}

/** Check whether a string is a supported rule category. */
function isRuleCategory(value: string): value is FrontendChecklistCategory {
  return RULE_CATEGORIES.some(category => category === value)
}

/** Check whether a string is a supported rule subcategory. */
function isRuleSubcategory(value: string): value is FrontendChecklistSubcategory {
  return RULE_SUBCATEGORIES.some(subcategory => subcategory === value)
}

/** Parse normalized categories from decoded frontmatter. */
function parseCategories(frontmatter: Record<string, unknown>): FrontendChecklistCategory[] {
  const values = readStringArray(frontmatter, 'categories') ?? []
  return values.map(value => value.toLowerCase()).filter(isRuleCategory)
}

/** Parse the four AI prompts used by the rule corpus. */
function parsePrompts(
  frontmatter: Record<string, unknown>
): FrontendChecklistRulePrompts | undefined {
  const value = frontmatter.prompts
  if (!isRecord(value)) return undefined

  const check = readString(value, 'check') ?? ''
  const fix = readString(value, 'fix') ?? ''
  const explain = readString(value, 'explain') ?? ''
  const codeReview = readString(value, 'codeReview')

  if (!check && !fix && !explain && !codeReview) return undefined

  return { check, fix, explain, ...(codeReview ? { codeReview } : {}) }
}

/** Parse authoritative source metadata attached to a rule. */
function parseSources(
  frontmatter: Record<string, unknown>
): FrontendChecklistRuleSource[] | undefined {
  const value = frontmatter.sources
  if (!Array.isArray(value)) return undefined

  const sources: FrontendChecklistRuleSource[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const id = readString(item, 'id')
    const title = readString(item, 'title')
    const url = readString(item, 'url')
    const type = readString(item, 'type')
    const role = readString(item, 'role')
    const authority = readString(item, 'authority')
    if (!(id && title && url && type && isSourceRole(role) && isSourceAuthority(authority)))
      continue
    sources.push({ id, title, url, type, role, authority })
  }

  return sources.length > 0 ? sources : undefined
}

/** Check a parsed source role against the active rule contract. */
function isSourceRole(value: string | undefined): value is FrontendChecklistRuleSource['role'] {
  return (
    value === 'standard' ||
    value === 'reference' ||
    value === 'implementation' ||
    value === 'compatibility' ||
    value === 'regulation' ||
    value === 'search' ||
    value === 'research'
  )
}

/** Check a parsed source authority against the active rule contract. */
function isSourceAuthority(
  value: string | undefined
): value is FrontendChecklistRuleSource['authority'] {
  return value === 'primary' || value === 'secondary'
}

/** Parse cross-rule relationships used for grounded follow-up guidance. */
function parseRelatedRules(
  frontmatter: Record<string, unknown>
): FrontendChecklistRelatedRule[] | undefined {
  const value = frontmatter.relatedRules
  if (!Array.isArray(value)) return undefined

  const relatedRules: FrontendChecklistRelatedRule[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const slug = readString(item, 'slug')
    const reason = readString(item, 'reason')
    if (!(slug && reason)) continue
    relatedRules.push({ slug, reason })
  }

  return relatedRules.length > 0 ? relatedRules : undefined
}

/**
 * Resolve packaged, source-workspace, and bundled-runtime rule locations.
 *
 * @param options - Optional directories used to verify bundled runtime resolution.
 * @returns The first rule directory available to the current process.
 */
export function resolveRulesDirectory(options: RulesDirectoryOptions = {}): string {
  const moduleDirectory = options.moduleDirectory ?? CURRENT_DIR
  const workingDirectory = options.workingDirectory ?? process.cwd()
  const candidates = [
    path.resolve(moduleDirectory, '../rules/en'),
    path.resolve(moduleDirectory, '../../content/rules/en'),
    path.resolve(workingDirectory, 'packages/rules/rules/en'),
    path.resolve(workingDirectory, 'packages/content/rules/en'),
    path.resolve(workingDirectory, '../../packages/rules/rules/en'),
    path.resolve(workingDirectory, '../../packages/content/rules/en')
  ]
  return candidates.find(candidate => fs.existsSync(candidate)) ?? candidates[0]
}

/** Decode YAML frontmatter into a safe record. */
function parseFrontmatter(rawFrontmatter: string): Record<string, unknown> | undefined {
  const value: unknown = parse(rawFrontmatter)
  return isRecord(value) ? value : undefined
}

/**
 * Load rule records from the package or monorepo content tree.
 *
 * @param rulesDir - Optional override for the rules directory.
 * @returns Normalized rule records for the rules package.
 */
export function loadRules(rulesDir: string = resolveRulesDirectory()): FrontendChecklistRule[] {
  if (!fs.existsSync(rulesDir)) return []

  const rules: FrontendChecklistRule[] = []
  for (const category of fs.readdirSync(rulesDir)) {
    const categoryPath = path.join(rulesDir, category)
    if (!fs.statSync(categoryPath).isDirectory()) continue

    const files = fs.readdirSync(categoryPath).filter(file => file.endsWith('.mdx'))
    for (const file of files) {
      const content = fs.readFileSync(path.join(categoryPath, file), 'utf-8')
      const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
      if (!frontmatterMatch) continue

      const frontmatter = parseFrontmatter(frontmatterMatch[1])
      if (!frontmatter) continue

      const slug = file.replace(/\.mdx$/, '')
      const categories = parseCategories(frontmatter)
      const directoryCategory = category.toLowerCase()
      const primaryCategory =
        categories[0] ?? (isRuleCategory(directoryCategory) ? directoryCategory : undefined)
      if (!primaryCategory) continue

      const priorityValue = readString(frontmatter, 'priority')
      const priority = priorityValue && isRulePriority(priorityValue) ? priorityValue : 'medium'
      const subcategoryValue = readString(frontmatter, 'subcategory')
      const subcategory =
        subcategoryValue && isRuleSubcategory(subcategoryValue) ? subcategoryValue : undefined
      const description = readString(frontmatter, 'description')
      const difficulty = readString(frontmatter, 'difficulty')
      const estimatedTime = readNumber(frontmatter, 'estimatedTime')
      const tldr = readStringArray(frontmatter, 'tldr')
      const whyItMatters = readString(frontmatter, 'whyItMatters')
      const aiContext = readString(frontmatter, 'aiContext')
      const prompts = parsePrompts(frontmatter)
      const sources = parseSources(frontmatter)
      const relatedRules = parseRelatedRules(frontmatter)

      rules.push({
        title: readString(frontmatter, 'title') ?? slug,
        ...(description ? { description } : {}),
        slug,
        categories: categories.length > 0 ? categories : [primaryCategory],
        ...(subcategory ? { subcategory } : {}),
        priority,
        ...(difficulty ? { difficulty } : {}),
        ...(estimatedTime !== undefined ? { estimatedTime } : {}),
        ...(tldr ? { tldr } : {}),
        ...(whyItMatters ? { whyItMatters } : {}),
        ...(aiContext ? { aiContext } : {}),
        ...(prompts ? { prompts } : {}),
        ...(sources ? { sources } : {}),
        ...(relatedRules ? { relatedRules } : {}),
        content: content.slice(frontmatterMatch[0].length).trim(),
        primaryCategory,
        url: `/rules/${primaryCategory}/${slug}`
      })
    }
  }

  return rules
}
