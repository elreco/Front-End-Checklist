# CodeRocket website recreation

## Product promise

The default journey is:

1. Paste one public or private HTTPS page.
2. Say whether the source is owned or only inspiration.
3. Review a private, editable version.
4. Publish deliberately.

The normal interface never shows source code, deployment settings, model names, tokens, queues, or
database terminology. The Studio is a full-height prompt-first workspace. Pages, versions, preview
sizes, and connections are compact contextual controls; Data and manual field editing do not appear
as competing primary modes. Website health monitoring remains available at `/monitoring` and inside
the application as **Website health**.

## Product model for July 2026

CodeRocket is one application project generated from an existing website model, not a collection of
unrelated cloned pages.

- **Prompt** turns a plain-language outcome into schema-validated operations, runs it as a durable
  background job, and creates an immutable revision. It is the only default creation surface.
- **Routes** represent useful page types. Repeated product, article, and category URLs become
  reusable components and structured collections instead of fifty hand-built pages.
- **Managed capabilities** create products, contacts, bookings, accounts, or other data when the
  requested outcome needs them. A novice never has to create a database account, table, policy, or
  environment variable.
- **Connections** appear contextually when the requested outcome needs provider permission. Guided
  Stripe, Supabase, Shopify, and other provider authorisation is the target; public payment or
  scheduling links remain an explicitly labelled compatibility fallback.
- **Publish** remains deliberate. An assistant change never silently replaces the live revision.

The controlled `SiteDocument` renderer remains the safe compatibility runtime for the current
vertical slice. It now supports repeated collections, responsive design, pages, managed data
shapes, and conversational changes. The target for features that genuinely require arbitrary
server code is an isolated project runtime behind the same no-code Studio: generated source is
stored privately, built in an ephemeral Fly Machine, scanned and tested, then published as an
immutable artifact. Code remains an optional export for developers, not part of the default
journey.

## Authorised SaaS screens

The default attempt still starts from the URL alone. When the requested page redirects to a
sign-in screen, the failed Studio state offers one recommended recovery: connect a dedicated,
revocable test account containing sample data. CodeRocket does not ask every user for credentials
up front and explicitly rejects the idea that a personal or administrator account is the normal
path.

The cloud action validates that the private page and sign-in page use HTTPS and belong to the same
origin as the original source. It encrypts the test email and password with the existing AES-GCM
managed-access envelope before sending them to Supabase. The database stores only the encrypted
envelope, a 24-hour expiry, and non-secret status metadata. The worker decrypts the envelope in
memory, signs in inside a separate Playwright browser context, and uses the rendered navigation to
select at most five representative app screens. It never follows sign-out or destructive routes.

The credential is cleared after the terminal attempt. Private desktop and phone captures remain
owner-only and expire after 24 hours like public-import captures. The authorised import recreates
visible screens and inferred editable structures; it does not copy the original database, server
code, users, permissions, payment records, private messages, or backend behaviour.

Common same-origin email-and-password forms are supported. CodeRocket does not bypass SSO, MFA,
CAPTCHA, passkeys, VPNs, WAF challenges, or external identity providers. For an owned source, the
failed Studio state can instead open a guided Browserless handoff. The owner completes the
challenge or sign-in directly inside that isolated browser, confirms when the useful page is open,
and the durable import resumes from the same browser process, IP address, cookies, and storage.
The live window lasts between four and ten minutes: CodeRocket chooses the longest duration that
fits the fixed provider-cost allowance rather than exposing pricing or timeout settings to the
user.

The Browserless API token is never included in the owner-facing live URL. The live URL and
token-free reconnect endpoint are encrypted with the managed-access AES-GCM envelope. A delayed
durable job reserves the full import budget before the live session becomes available, but remains
unclaimable while the owner is interacting, so the normal worker is not held open. The provider
price per whole browser minute is required in
`CODEROCKET_BROWSERLESS_COST_MICROEUR_PER_MINUTE`, contributes to settlement, and is bounded so a
Launch import still fits its reserved margin ceiling.

Once the owner continues, the worker validates the reconnect host against the configured
Browserless endpoint before attaching the provider token. It closes the interactive stream, checks
that the requested same-origin page is now available, captures the bounded authorised screens, and
destroys the remote browser. Expired, failed, cancelled, and completed handoffs clear the encrypted
session. The owner can stop and destroy the browser before continuing; the unused reservation is
returned while the elapsed provider time remains metered. The default interface never asks the
user to paste cookies. The temporary test-account method remains a secondary option for ordinary
same-origin credentials.

The guided browser shows its navigation and tabs. Newly opened sign-in tabs receive the same public
HTTPS and private-network request checks as the source tab, which allows common Google, Microsoft,
magic-link, and other popup-based identity journeys without allowing access to private addresses.
The user must return to the source website before continuing. Platform passkeys tied to the user's
physical device still cannot work inside a cloud browser.

## Access recovery ladder

CodeRocket should attempt the least demanding path first and expose only the next useful action.
The internal ladder is broader than the interface:

| Obstacle | Default recovery | What the user sees |
| --- | --- | --- |
| Public HTTPS page | Automatic capture | Creation progress |
| Temporary failure or unsuitable URL | Retry or choose another same-site page | “Choose the useful page” |
| Simple same-origin account | Dedicated test account | “Use a temporary test account” |
| Cloudflare, CAPTCHA, SSO, MFA, magic link | Guided cloud browser | “Open the guided browser” |
| Cloud browser IP or automation refused | Local browser companion | “Continue from your computer” |
| Passkey, intranet, VPN-only or localhost | Local browser companion | “Open it in your normal browser” |
| No live website available | Screenshot or design source | “Start from what you can share” |

The local browser companion is the required fallback for the broadest authorised coverage. It is a
small Chrome extension using temporary `activeTab` permission. When the owner deliberately starts a
capture, it should:

- measure the visible DOM, computed layout, responsive states, navigation, and repeated content;
- capture the visible page and owner-selected additional screens;
- download public assets or upload bounded copies that the owner explicitly approves;
- send the same non-executable blueprint shape used by the cloud importer;
- work on intranet and signed-in pages without exporting cookies, local storage, passwords, or the
  browser profile;
- show exactly which pages and assets will be uploaded before submission;
- disconnect immediately after the capture and retain no background browsing permission.

The companion must not use `chrome.debugger` by default, record browsing history, monitor tabs in
the background, or transmit raw cookies. `activeTab`, `chrome.scripting`, and
`chrome.tabs.captureVisibleTab` are sufficient for the normal capture path. A developer-only local
CLI may later use the same upload protocol for Firefox, Safari, automated test environments, and
private networks.

“Any website” therefore means any public or explicitly authorised visual source that CodeRocket can
observe through one of these bounded paths. It does not mean bypassing access controls, copying a
database or backend, defeating DRM, or cloning information the user is not allowed to use.

## Safe recreation model

CodeRocket does not deploy arbitrary source code copied from another origin.

The worker opens the rendered public page or explicitly authorised test-account page in the existing
hardened Playwright session. It validates every network origin, blocks non-HTTPS requests, refuses
private-network addresses, and studies the layout at 1440 px, 768 px, and 390 px. It captures a
bounded blueprint:

- visible text and headings;
- HTTPS images and links;
- visible sections and navigation;
- computed foreground, background, and action colours;
- measured type, spacing, width, image, border, and surface styles;
- desktop, tablet, and mobile layout changes;
- visible title, description, and brand label.

It stores neither source-site HTML nor source-site JavaScript. The blueprint becomes a versioned
`SiteDocument` rendered through controlled React components. Repeated cards are preserved as
structured items with their visible images, labels, prices, and public links.

When `OPENAI_API_KEY` is configured, only the first desktop and mobile screenshots are sent
transiently to the OpenAI Responses API at bounded `high` detail. This also applies to an authorised
test-account import, so the interface requires sample data rather than real customer information. A
strict structured-output schema may refine visual properties only. It cannot change copy, links,
media, identity, scripts, or backend behaviour. Screenshots are not stored in the site document.
Secondary pages reuse the refined design system while retaining their own measured responsive
geometry.

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

The additive website Studio migrations create:

- `cr_builder_sites`: ownership, source, public slug, state, and published revision;
- `cr_site_revisions`: immutable, bounded site documents;
- `cr_builder_usage_accounts`: monthly cost reservations, import counts, and hosted visits;
- `cr_builder_cost_ledger`: auditable reserve, charge, and release entries;
- `cr_builder_import_events`: owner-visible milestones without prompts, tokens, or raw worker logs;
- `cr_builder_access_connections`: short-lived encrypted test-account access with no plaintext
  credential columns;
- one new `site_import` kind in the existing `cr_jobs` queue.
- a customer-visible credit account and immutable credit ledger;
- durable owner-visible website messages and a `site_edit` job;
- managed collections, bounded records, and a connector catalogue.

The URL-first creation form can also save one optional `initial_instruction`. It does not mutate the
capture while the source is being studied. After `cr_settle_site_import` has durably stored the
faithful first revision, the service-only `cr_queue_initial_site_instruction` function queues the
request as an ordinary `site_edit` job. It therefore receives the same €0.15 provider reservation,
six-credit customer ceiling, conversation history, failure refund, and immutable version semantics
as a request sent later from the Studio. If that second reservation cannot be made, the imported
revision remains ready and the conversation clearly asks the owner to resend the request; no extra
credits are consumed.

The existing Fly.io worker claims imports with the same leases and retry policy as website checks.
The worker renews its five-minute lease every minute while it owns a long import. If the process
disappears, the lease expires and another worker can safely claim the durable PostgreSQL job. A
terminal failure releases the unused reservation and preserves a plain-language recovery state.
The owner can retry that same failed website without consuming another advertised import; the new
attempt still reserves its full worst-case provider cost before queueing.

During active work the worker updates durable job progress and inserts bounded milestones. The
Studio subscribes to those inserts through Supabase Realtime, then refreshes its owner-scoped
progress endpoint. A six-second poll remains as a silent fallback when the realtime connection is
unavailable, so closing, reloading, or opening the Studio in another tab cannot strand the job or
its interface.

The current pilot authorizes one owner account per website. Several tabs or devices signed into
that account can observe the same job. Separate team members are not authorized yet: an enterprise
workspace must add organisation membership and role-aware RLS policies before multiple accounts can
open the same Studio. The queue and event model remain reusable because processing already depends
on the durable website and job IDs rather than on any viewer connection.

## Hosting without Vercel

The CodeRocket SaaS and worker continue to deploy with `fly.coderocket.toml`.

The first production hosting path is `/s/:slug` on the existing Fly.io application. It resolves only
the immutable revision the owner explicitly published. A monthly server-side visit counter refuses
traffic beyond the included ceiling instead of producing an unbounded infrastructure bill.

Controlled sites continue to use:

- Cloudflare DNS and edge routing for custom domains;
- R2 or Tigris for copied and optimised owner-approved assets;
- cached SiteDocument responses at the edge;
- the Fly.io/Supabase control plane as the source of truth.

Full-stack project builds use short-lived, per-job Fly Machines with no customer traffic or secrets
shared between builds. Successful artifacts deploy to a separate runtime pool with hard CPU,
memory, storage, and request limits. Failed builds are destroyed. This avoids a Vercel dependency
and keeps generated applications portable.

## Connections for non-developers

Connections should be introduced in this order:

1. **Plain secure links**: Stripe Payment Links, Calendly, Cal.com, contact and booking destinations.
   These are available in the Connections panel and need no API key.
2. **Guided OAuth connections**: Stripe Checkout, Shopify products, forms, newsletter providers.
   Ask for the business outcome first, then open the provider connection.
3. **Managed data features**: forms, members, and catalogues on CodeRocket-managed Supabase projects.
   Do not ask a novice to create tables, policies, environment variables, or a Supabase account.
4. **Advanced bring-your-own services**: available behind technical details for developers and
   agencies only.

## Margin protection

Internal plan IDs stay `free`, `solo`, and `agency`; customer labels are Free, Launch, and Studio.

| Plan | Created sites | Creation credits / month | First-version page types | Hosted visits / month | Variable-cost ceiling |
| --- | ---: | ---: | ---: | ---: | ---: |
| Free | 0 | 0 | Demo only | 0 | €0 |
| Launch | 1 | 100 | Up to 5 | 20,000 | €6 |
| Studio | 10 | 600 pooled | Up to 5 each | 250,000 pooled | €40 |

The displayed and charged monthly prices use stable EUR, USD, GBP, CAD, AUD, or CHF price points
selected from the visitor's country. The selected currency is submitted to Checkout explicitly,
and every subscription item—including optional metered AI usage—supports the same currencies. The
values in `apps/cloud/lib/pricing.ts` must match the active Stripe `currency_options` exactly.

These ceilings are hard defaults:

- work reserves provider cost before queueing;
- one useful first version costs 20 visible credits;
- one guided change or new page costs at most 6 credits;
- free manual field changes do not invoke a model and consume no credits;
- terminal failures automatically return their visible credits;
- each Launch import reserves at most €0.25 and each Studio import €0.75;
- each conversational edit reserves at most €0.15;
- the OpenAI request accepts at most two compressed screenshots and 1,800 output tokens;
- browser runtime is metered internally in conservative whole-minute blocks;
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

## July 2026 delivery boundary

The current vertical slice selects at most five representative page types, captures repeated cards
as structured content, supports durable conversational edits and new pages, exposes managed
collection presets, saves no-secret Stripe and scheduling links, and publishes immutable revisions.

The next bounded additions are:

- screenshot and Figma sources routed through the same creation form and project model;
- binding managed collection records to editable collection, form, and account components;
- encrypted OAuth for Stripe Connect, Shopify, and bring-your-own Supabase;
- isolated generated-code workspaces for features beyond the controlled renderer;
- screenshot-to-preview visual difference scoring and bounded repair passes;
- automatic accessibility, search, security, and performance checks before publish;
- custom domains, rollback, asset ownership, and edge caching;
- human-readable export and provider portability.

Each addition must retain the same rule: advanced capability may expand, but the default journey
still starts with one URL and one obvious next action.
