# CodeRocket operations

## Supabase

Apply `packages/coderocket-db/supabase/migrations` in filename order. Public objects are restricted
to the `cr_*` namespace. Only server routes and the worker receive `SUPABASE_SERVICE_ROLE_KEY`; it
must never use a `NEXT_PUBLIC_` prefix.

Before accepting users, verify account providers and callback URLs, confirm every `auth.users.id`
has matching `cr_profiles` and `cr_subscriptions` rows, and run cross-owner RLS checks with two
non-service sessions.

## Website imports and protected access

Public URL capture is the default. Managed test credentials and Browserless handoffs appear only
when a source cannot be opened normally. Access values are encrypted, sent only to the authorized
origin, and cleared after the bounded import attempt. Never log plaintext credentials.

CodeRocket does not bypass SSO, MFA, CAPTCHA, passkeys, VPNs, WAFs, or private networks. Those cases
need a guided browser, a future local companion, or a different source.

## Figma

Register a Figma OAuth app with `file_content:read` and these callbacks:

- local: `http://localhost:3100/api/connections/figma/return`
- production: `https://www.coderocket.app/api/connections/figma/return`

Set `FIGMA_CLIENT_ID` and `FIGMA_CLIENT_SECRET`. Tokens are encrypted and never returned to browser
code. Imports are limited to owner-selected screens.

## Stripe

Create monthly Launch and Studio recurring prices with the currencies listed in
`apps/cloud/lib/pricing.ts`. Keep the displayed values identical to Stripe `currency_options`.
Enable automatic tax and tax ID collection, and register the subscription webhook. Replayed events
must remain idempotent through `cr_stripe_events`.

Website creation, creation credits, and hosted visits stop at their included ceilings. No overage
is enabled automatically.

## Fly.io

`fly.coderocket.toml` defines separate `web` and `worker` process groups. The release command applies
the additive migrations. Required secrets are Supabase, `DATABASE_URL`, Stripe, OpenAI, and a shared
32+ character `CODEROCKET_ACCESS_ENCRYPTION_KEY`; Browserless and Figma are optional integrations.

Deploy and smoke-test the Fly hostname before changing DNS. Verify `/api/health`, authentication
callbacks, sitemap, robots, social previews, one source import, one edit, and one explicit publish.
The deployment workflow can roll back to the previous image if the readiness request fails.
