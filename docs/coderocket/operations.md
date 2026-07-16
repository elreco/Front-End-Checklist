# CodeRocket operations

## Supabase cutover

1. Back up the historical CodeRocket Supabase project.
2. Verify `email`, GitHub, Google, and Facebook providers are still enabled.
3. Add `https://coderocket.app/auth/callback` and the local callback to the Auth redirect allow-list.
4. Apply the `packages/coderocket-db/supabase/migrations` files. The first migration disables the legacy broad welcome-email trigger before creating the new profile trigger.
5. Confirm every historical `auth.users.id` has a matching `cr_profiles` and `cr_subscriptions` row.
6. Run cross-owner RLS tests with two non-service sessions before accepting signups.

Only the worker and server routes receive `SUPABASE_SERVICE_ROLE_KEY`. It must never use a `NEXT_PUBLIC_` prefix.

## Stripe

- Create monthly Solo (€19) and Agency (€59) recurring prices.
- Put their IDs in `STRIPE_SOLO_PRICE_ID` and `STRIPE_AGENCY_PRICE_ID`.
- Enable automatic tax and tax ID collection in Checkout.
- Register `/api/stripe/webhook`; subscribe to subscription create/update/delete and invoice payment failure events.
- Replay events with Stripe CLI and verify `cr_stripe_events` remains idempotent.

## Fly.io

`fly.coderocket.toml` defines `web` and `worker` process groups in `cdg`. Before every migration, the release command creates a private database dump in the `cr-migration-backups` Storage bucket.

Backups are private custom-format `pg_dump` files split into 5 MiB parts. The JSON manifest is uploaded last and records the ordered part names, byte sizes, and SHA-256 hashes. To test a recovery, download the manifest and every part into an isolated environment, verify every hash, concatenate the parts in manifest order, then restore the reconstructed dump into a fresh PostgreSQL database with `pg_restore --no-owner --no-acl`. Never test restoration against the live database.

Required secrets: Supabase public URL/key, service role key, `DATABASE_URL`, Stripe secrets, and Resend key.

Deploy and smoke-test the Fly hostname first. Only then:

1. add the apex domain certificate in Fly;
2. point the apex DNS records at Fly;
3. add `www` and verify its permanent redirect to the apex;
4. verify `/api/health`, sign-in callbacks, sitemap, robots, social card, favicon, and a private report;
5. submit the new sitemap and remove historical AI-builder URLs in Search Console.

The deployment workflow records the previous image. If the canonical health smoke test fails, it redeploys that image with an immediate strategy and skips the release command.

## Pilot sequence

1. Owner account only.
2. Five historical CodeRocket users, invited individually.
3. Validate three audit cycles, a preview gate, a share-link revoke, and all Stripe lifecycle states.
4. Enable new registrations.
5. Enable `CODEROCKET_COMMERCIAL_LAUNCH=true` only after the legal launch gate passes.
