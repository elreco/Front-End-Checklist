# AGENTS.md — CodeRocket

Repository guidance for contributors and automation.

## Product boundary

CodeRocket is a clone-first website builder. It starts from a public website, an explicitly
authorized private page, or a connected Figma design and creates one coherent, editable project.

The repository does not contain Website Health, audits, findings, monitoring schedules, the
Front-End Checklist rule corpus, its MCP server, or its CLI. Do not reintroduce those products or
their database concepts.

## Product defaults

- Design one product for non-developers and developers.
- Keep the recommended journey minimal: source, private version, plain-language changes, publish.
- Make the Studio full-height and prompt-first. Pages, versions, preview controls, data, and
  connections are contextual controls.
- Infer project changes from outcomes such as adding a product, shop, booking, or account.
- Request provider authorization only when it is genuinely required.
- Never describe a pasted public payment or booking link as a connected provider account.
- Lead with the outcome, then the reason and one clear next action.
- Keep internal terms such as queues, workers, tokens, cookies, headers, and model configuration
  behind technical details.
- State access limits truthfully. CodeRocket cannot bypass CAPTCHA, MFA, VPNs, passkeys, WAFs, or
  private networks.
- Design loading, empty, partial, success, error, retry, long-content, responsive, keyboard, and
  reduced-motion states.
- Visually verify user-facing changes in a real browser at relevant viewport sizes.

Read `docs/coderocket/product-principles.md` before changing a journey, interface, or user-facing
message.

## Repository map

```text
apps/cloud/                 Next.js app and published-site runtime
packages/coderocket-ai/     Structured generation and edit requests
packages/coderocket-core/   Capture, Figma, site documents, access, entitlements
packages/coderocket-db/     Supabase client and additive cr_* migrations
packages/coderocket-worker/ Durable site_import and site_edit processing
packages/design-system/     Shared UI, icons, and CodeRocket identity
packages/utils/             Shared utilities
configs/config-typescript/  TypeScript presets
```

## Implementation conventions

- Package manager: pnpm workspaces with Turborepo.
- Validation: Zod v4; read `ZodError.issues`, not `.errors`.
- Keep credentials server-only and encrypted with the shared access envelope.
- Database objects must use the `cr_` namespace. Migrations are additive and owner data requires RLS.
- The worker processes only durable `site_import` and `site_edit` jobs.
- A generated change creates an immutable revision. Publishing never happens implicitly.
- Source HTML and JavaScript are not persisted or executed as generated output.
- Browser support decisions come from `.browserslistrc` and package-backed compatibility data.

## Interface conventions

- Reuse the design system and existing components before adding a page-specific variant.
- Use Tailwind utilities in components instead of adding global CSS for local styling.
- Card links use the stretched-link pattern documented in `docs/card-links.md` when applicable.
- Import Lucide and brand icons only through `@repo/design-system`.
- Use the official Figma, Stripe, and other brand icons for branded services.
- Never add opacity modifiers to semantic text tokens such as `text-foreground-muted`.
- Do not use `suppressHydrationWarning`; fix the server/client mismatch.
- Keep shared typography and font concerns in the design system.
- Refer to the social platform as “X”, never “Twitter”.
- The About link belongs in the footer only if an About page exists.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test:ci
pnpm build
```

Pre-commit hooks also enforce secret scanning, file size, formatting, JSDoc, no unsafe type casts,
barrel discipline, and file complexity. Fix violations; do not bypass hooks.
