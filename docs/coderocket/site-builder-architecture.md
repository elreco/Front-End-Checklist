# CodeRocket website recreation

## Product promise

The default journey is:

1. Paste one public HTTPS URL.
2. Say whether the source is owned or only inspiration.
3. Review a private, editable version.
4. Publish deliberately.

The normal interface never shows source code, deployment settings, model names, tokens, queues, or
database terminology. Website health monitoring remains available at `/monitoring` and inside the
application as **Website health**.

## Safe recreation model

CodeRocket does not deploy arbitrary source code copied from another origin.

The worker opens the rendered public page in the existing hardened Playwright session. It validates
every network origin, blocks non-HTTPS requests, refuses private-network addresses, and studies the
layout at 1440 px, 768 px, and 390 px. It captures a bounded blueprint:

- public text and headings;
- HTTPS images and links;
- visible sections and navigation;
- computed foreground, background, and action colours;
- measured type, spacing, width, image, border, and surface styles;
- desktop, tablet, and mobile layout changes;
- public title, description, and brand label.

It stores neither raw HTML nor JavaScript. The blueprint becomes a versioned `SiteDocument` rendered
through controlled React components. This gives the user an editable result without creating one
untrusted application runtime per customer.

When `OPENAI_API_KEY` is configured, only the homepage desktop and mobile screenshots are sent
transiently to the OpenAI Responses API at bounded `high` detail. A strict structured-output schema
may refine visual properties only. It cannot change copy, links, media, identity, scripts, or
backend behaviour. Screenshots are not stored in the site document. Secondary pages reuse the
refined design system while retaining their own measured responsive geometry.

While an import is running, the same bounded desktop and mobile captures may be copied to the
private `cr-builder-imports` Supabase Storage bucket so the owner can see what CodeRocket is
studying. Links are short-lived, access remains owner-scoped, and the worker removes the files after
24 hours. The durable activity history keeps only plain-language milestones after the images
expire.

CodeRocket uses the existing official OpenAI SDK directly. It does not use the Vercel AI SDK because
the job is a single server-side, non-streaming, schema-validated analysis and the additional
abstraction would not improve the novice-facing journey.

`owned` mode may retain visible identity and content. `inspiration` mode discards source logos,
images, and copy, and keeps only broad visual direction. This separation is enforced in
`createSiteDocument`, not only in interface copy.

## Storage and jobs

The additive `202607190001_site_builder_foundation.sql` migration creates:

- `cr_builder_sites`: ownership, source, public slug, state, and published revision;
- `cr_site_revisions`: immutable, bounded site documents;
- `cr_builder_usage_accounts`: monthly cost reservations, import counts, and hosted visits;
- `cr_builder_cost_ledger`: auditable reserve, charge, and release entries;
- `cr_builder_import_events`: owner-visible milestones without prompts, tokens, or raw worker logs;
- one new `site_import` kind in the existing `cr_jobs` queue.

The existing Fly.io worker claims imports with the same leases and retry policy as website checks.
A terminal failure releases the unused reservation and preserves a plain-language recovery state.
During active work it updates the durable job progress and inserts bounded milestones. The Studio
subscribes to those inserts through Supabase Realtime, then refreshes its owner-scoped progress
endpoint. A six-second poll remains as a silent fallback when the realtime connection is
unavailable, so a disconnected browser cannot strand the interface.

## Hosting without Vercel

The CodeRocket SaaS and worker continue to deploy with `fly.coderocket.toml`.

The first production hosting path is `/s/:slug` on the existing Fly.io application. It resolves only
the immutable revision the owner explicitly published. A monthly server-side visit counter refuses
traffic beyond the included ceiling instead of producing an unbounded infrastructure bill.

The next infrastructure step is not a code-per-customer runtime. It is:

- Cloudflare DNS and edge routing for custom domains;
- R2 for copied and optimised owner-approved assets;
- cached SiteDocument responses at the edge;
- the Fly.io/Supabase control plane as the source of truth.

This avoids a Vercel dependency and keeps generated websites portable. A static exporter can later
emit the same SiteDocument renderer to another object store without changing the editor data model.

## Connections for non-developers

Connections should be introduced in this order:

1. **Plain secure links**: Stripe Payment Links, Calendly, Cal.com, contact and booking destinations.
   This is already supported by the main-action field and needs no API key.
2. **Guided OAuth connections**: Stripe Checkout, Shopify products, forms, newsletter providers.
   Ask for the business outcome first, then open the provider connection.
3. **Managed data features**: forms, members, and catalogues on CodeRocket-managed Supabase projects.
   Do not ask a novice to create tables, policies, environment variables, or a Supabase account.
4. **Advanced bring-your-own services**: available behind technical details for developers and
   agencies only.

## Margin protection

Internal plan IDs stay `free`, `solo`, and `agency`; customer labels are Free, Launch, and Studio.

| Plan | Created sites | Imports / month | Pages / import | Hosted visits / month | Variable-cost ceiling |
| --- | ---: | ---: | ---: | ---: | ---: |
| Free | 0 | 0 | 0 | 0 | €0 |
| Launch | 1 | 5 | 10 | 20,000 | €6 |
| Studio | 10 | 50 | 50 | 250,000 pooled | €40 |

The displayed EUR prices are €29 and €149 per month. Localised price points are stored in
`apps/cloud/lib/pricing.ts` and must match Stripe.

These ceilings are hard defaults:

- work reserves provider cost before queueing;
- each Launch import reserves at most €0.25 and each Studio import €0.75;
- the OpenAI request accepts at most two compressed screenshots and 1,800 output tokens;
- live model pricing is read from `cr_ai_model_pricing` before any screenshot is sent, then converted
  with a conservative currency buffer;
- if the worst permitted request no longer fits the reservation, CodeRocket uses its measured
  responsive fallback and does not call the model;
- settlement cannot exceed the reservation;
- free accounts cannot trigger builder work;
- hosting pauses at the included visitor ceiling;
- no builder or hosting overage is automatic.

Payment fees, tax, support, Fly.io, Supabase, email, storage, and observability still belong in the
monthly margin report. Before enabling a new model, importer, or connector, add its real provider
price to the cost ledger and set a reservation that covers the worst permitted request. A feature
without a measurable worst-case cost must not be enabled as unmetered work.

## July 2026 follow-up

The current vertical slice discovers same-origin pages through the homepage and sitemap, recreates
them up to the plan ceiling, records unavailable paths explicitly, studies responsive layouts,
optionally refines the homepage design system with bounded vision analysis, and publishes every
captured path through the same versioned site document. The next bounded additions are:

- adding, removing, renaming, and reordering pages inside the studio;
- screenshot-to-preview visual difference scoring and bounded repair passes;
- conversational edits that produce schema-validated document patches;
- automatic accessibility, search, security, and performance checks before publish;
- custom domains, rollback, asset ownership, and edge caching;
- guided commerce and form connections;
- human-readable export and provider portability.

Each addition must retain the same rule: advanced capability may expand, but the default journey
still starts with one URL and one obvious next action.
