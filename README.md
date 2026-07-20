# CodeRocket

CodeRocket turns an existing website or a Figma design into a private, editable website. The normal
journey is simple: choose a source, let the worker build a first version, ask for changes in plain
language, and publish deliberately.

This repository is the standalone CodeRocket product. It intentionally excludes the original
Front-End Checklist application, rule corpus, MCP server, CLI, and Website Health product.

## What is included

- `apps/cloud` — Next.js marketing site, account area, creation flow, Studio, billing, and published sites
- `packages/coderocket-core` — safe source capture, Figma parsing, site documents, access handoffs, and plan limits
- `packages/coderocket-ai` — schema-validated first versions and guided edits
- `packages/coderocket-db` — isolated `cr_*` Supabase schema and migrations
- `packages/coderocket-worker` — durable `site_import` and `site_edit` jobs
- `packages/design-system` — shared CodeRocket interface components and icons
- `packages/utils` — shared class-name utilities

Product behavior is documented in [docs/coderocket/product-principles.md](docs/coderocket/product-principles.md).

## Local development

Requirements: Node 24, pnpm 10, Supabase, and Chromium for website capture.

```bash
pnpm install
cp apps/cloud/.env.example apps/cloud/.env.local
pnpm --filter @coderocket/db migrate
pnpm dev:coderocket
```

The cloud app runs on `http://localhost:3100`. Set `CODEROCKET_DEMO_MODE=true` to inspect public and
dashboard surfaces without connecting production services.

Core environment groups are documented in `apps/cloud/.env.example`:

- Supabase and `DATABASE_URL`
- OpenAI website generation
- optional Browserless access handoff
- optional Figma OAuth import
- Stripe subscriptions and Stripe Connect

Keep `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, provider secrets, and the shared access-encryption
key server-only.

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm test:ci
pnpm build
```

Run all four with `pnpm ci:check` before deployment.

## Deployment

`Dockerfile.coderocket` builds the cloud app and worker. `fly.coderocket.toml` runs them as separate
Fly.io process groups and applies the additive `cr_*` migrations as a release command. The health
endpoint at `/api/health` reports web, database, and worker readiness; it is operational plumbing,
not a website-monitoring feature.

Publishing a generated site is always explicit. Drafts and previous versions remain private to the
owner, and no source JavaScript, database, cookies, or credentials are copied into the published site.
