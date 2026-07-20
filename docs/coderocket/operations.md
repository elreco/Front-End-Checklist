# CodeRocket operations

## Supabase cutover

1. Do not modify historical application tables. Automated schema migrations only reference
   CodeRocket `cr_*` objects. The audited legacy-premium reconciliation below is the sole exception
   allowed to read historical billing tables.
2. Verify `email`, GitHub, Google, and Facebook providers are still enabled.
3. Add `https://www.coderocket.app/auth/callback` and the local callback to the Auth redirect allow-list.
4. Apply the `packages/coderocket-db/supabase/migrations` files. The first migration disables the legacy broad welcome-email trigger before creating the new profile trigger.
5. Confirm every historical `auth.users.id` has a matching `cr_profiles` and `cr_subscriptions` row.
6. Run cross-owner RLS tests with two non-service sessions before accepting signups.

Only the worker and server routes receive `SUPABASE_SERVICE_ROLE_KEY`. It must never use a `NEXT_PUBLIC_` prefix.

### Historical premium accounts

Before inviting historical users, reconcile previous paid CodeRocket subscriptions:

```bash
pnpm --filter @coderocket/cloud sync:legacy-premium
pnpm --filter @coderocket/cloud sync:legacy-premium -- --apply
```

The first command is a dry run. The apply command reads the old `subscriptions`, `prices`, and
`products` records, verifies every candidate against the current Stripe subscription, and updates
only matching `cr_subscriptions` rows that are still on Free. Historical `Starter` and `Pro`
products become Launch (`solo`); `Enterprise` becomes Studio (`agency`). Canceled, missing, and
unrelated products are excluded. The command prints aggregate counts only, is safe to rerun, and
never changes the historical tables.

## Stripe

- Create monthly Launch (€29, internal plan id `solo`) and Studio (€149, internal plan id
  `agency`) recurring prices.
- Keep website creation and hosted-visit overage disabled by default. The database hard-stops at
  the included ceilings documented in `site-builder-architecture.md`.
- Put their IDs in `STRIPE_SOLO_PRICE_ID` and `STRIPE_AGENCY_PRICE_ID`.
- Enable automatic tax and tax ID collection in Checkout.
- Register `/api/stripe/webhook`; subscribe to subscription create/update/delete and invoice payment failure events.
- Keep grandfathered subscription IDs in `cr_subscriptions`; webhook updates use the stored paid
  plan when an old Stripe price does not match a current price environment variable.
- Replay events with Stripe CLI and verify `cr_stripe_events` remains idempotent.

## Fly.io

`fly.coderocket.toml` defines `web` and `worker` process groups in `cdg`. The release command only runs the CodeRocket migrations. The migration runner rejects any pending SQL file that references a `public` database object outside the `cr_*` namespace, so historical application tables remain outside the product boundary.

Required secrets: Supabase public URL/key, service role key, `DATABASE_URL`, Stripe secrets, Resend key, and a random 32+ character `CODEROCKET_ACCESS_ENCRYPTION_KEY` shared by the web and worker processes. `OPENAI_API_KEY` is required only for the optional AI fix assistant. Set `CODEROCKET_AI_MODEL` only when overriding the default `gpt-5.6-terra` model.

## Managed protected-page access

- The public cloud check remains the default and requires only the website URL.
- When a page is blocked, the web process verifies a dedicated Vercel, Cloudflare, Basic Auth, token, session-cookie, or custom-header connection before saving it.
- Access headers are encrypted with AES-256-GCM in `cr_project_access_connections`. Plaintext values are never returned to the browser after submission and must never be logged.
- The worker decrypts values only while checking that owner’s project. Page-session credentials are sent only to paths explicitly marked as authenticated; origin-wide hosting credentials apply to the monitored origin.
- Changing the monitored website origin revokes the stored connection. Cross-origin redirects never receive managed headers.
- Private networks, VPNs, mTLS, CAPTCHA, MFA, and multi-step browser sign-in remain secure-runner cases; the UI must not describe them as connected to the cloud checker.

## AI fix assistant

- The web process only validates and enqueues requests; the worker is the only process that calls the model.
- `cr_request_ai_analysis` reserves plan credits and creates the task and PostgreSQL job in one transaction.
- The worker reloads the matching local Front-End Checklist rule and verifies its hash before sending any evidence to the model.
- Website content is treated as untrusted input, common credentials are redacted, no model tools are enabled, and OpenAI response storage is disabled.
- `cr_settle_ai_analysis` atomically charges actual usage or releases the reservation after a terminal failure. Replayed jobs and requests remain idempotent.
- Each task snapshots its provider token rates, pricing version, currency, and CodeRocket multiplier before it enters the queue. The ledger preserves both provider cost and customer charge in integer micro-USD; the initial multiplier is `3x` for pilot measurement and can be changed by a controlled pricing migration without rewriting history.
- A model response can explain and plan only. It cannot mark a finding fixed; that state changes only after another deterministic website check.

Monitor queued/running `ai_analysis` jobs, terminal task errors, reserved-versus-consumed credits, and provider request IDs. Repeated failures should alert operations without exposing finding evidence in logs.

Deploy and smoke-test the Fly hostname first. Only then:

1. add the apex domain certificate in Fly;
2. point the apex DNS records at Fly;
3. add `www` as the canonical host and verify the apex permanently redirects to it;
4. add `docs` and verify it permanently redirects into the canonical `/docs` section;
5. verify `/api/health`, sign-in callbacks, sitemap, robots, social card, favicon, and a private report;
6. submit the new sitemap and remove historical AI-builder URLs in Search Console.

The deployment workflow records the previous image. If the canonical health smoke test fails, it redeploys that image with an immediate strategy and skips the release command.

## Pilot sequence

1. Owner account only.
2. Five historical CodeRocket users, invited individually.
3. Validate three audit cycles, a preview gate, a share-link revoke, and all Stripe lifecycle states.
4. Enable new registrations.
5. Enable `CODEROCKET_COMMERCIAL_LAUNCH=true` only after the legal launch gate passes.
