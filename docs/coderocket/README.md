# CodeRocket product fork

CodeRocket is the commercial product layer built on the Front-End Checklist corpus. Upstream code remains on `main`; product work lives on `coderocket/main`.

Product and interface decisions must follow the
[CodeRocket product principles](./product-principles.md).

## Boundaries

- `apps/cloud`: Next.js marketing site and authenticated SaaS
- `packages/coderocket-core`: plan limits, SSRF-safe HTML fetch, fingerprints, audit diffs, quality gates
- `packages/coderocket-db`: isolated `cr_*` Supabase schema, RLS, service client, additive migrations
- `packages/coderocket-cli`: CI command and documented exit codes
- `packages/coderocket-worker`: PostgreSQL-leased jobs, schedules, retention, and narrow alerts
- `packages/coderocket-ai`: evidence-grounded explanations and fix plans from an exact rule snapshot
- `packages/design-system/src/coderocket-logo.tsx`: canonical React mark and wordmark

The website check remains deterministic: AI never decides whether a rule passes, never closes a finding, and has no tool that can edit a website or repository. It only turns saved evidence plus the matching Front-End Checklist rule into a structured explanation and plan. A fresh website check is always required to verify a fix.

## Official documentation

`apps/cloud/app/docs` is the canonical CodeRocket product and technical reference. Its rules index and 385 rule pages are generated from `@frontendchecklist/rules`, which reads the maintained `packages/content/rules/en` corpus. No rule content is copied into the SaaS.

Every upstream sync that changes the corpus, rules package, or MCP analyzer triggers CodeRocket CI. The cloud build regenerates the documentation pages and the same ruleset hash used by audits, so documentation and gate behavior move together after the sync PR is merged and deployed.

No historical CodeRocket project, credit, generation, or subscription table is read. Only the existing Supabase `auth.users` identities are retained.

## Local development

1. Copy `apps/cloud/.env.example` to `apps/cloud/.env.local`.
2. Fill the legacy CodeRocket Supabase URL and publishable key.
3. Run `pnpm --filter @coderocket/cloud dev`.
4. Run the worker separately with `pnpm --filter @coderocket/worker start` after applying migrations.

Set the same random 32+ character `CODEROCKET_ACCESS_ENCRYPTION_KEY` on the web and worker deployments so guided protected-page connections can be encrypted and used by scheduled checks. Set `OPENAI_API_KEY` to enable the optional AI fix assistant. `CODEROCKET_AI_MODEL` defaults to `gpt-5.6-terra` and can be overridden without changing the stored prompt or rule snapshot version.

Without secrets, set `CODEROCKET_DEMO_MODE=true` to review the public marketing and dashboard surfaces.

## Launch gate

`CODEROCKET_COMMERCIAL_LAUNCH` must remain `false` until all of the following are complete:

- the upstream repository restores and confirms the licence it describes as MIT;
- the owner configures Stripe Tax, VAT identity collection, products, and prices;
- CodeRocket terms and privacy policy receive legal review;
- three complete production audit cycles succeed for the pilot cohort.

The server returns `503` from Checkout while the commercial flag is disabled.
