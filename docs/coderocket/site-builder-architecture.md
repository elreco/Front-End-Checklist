# CodeRocket website builder architecture

## Source to project

The default journey starts from a public HTTPS page. A connected Figma file and an explicitly
authorized private page enter the same durable import queue. CodeRocket selects at most five
representative screens, captures bounded responsive evidence, and builds one shared project model.

The importer stores neither source HTML nor source JavaScript. It extracts visible text, HTTPS
images and links, sections, navigation, colors, typography, spacing, and responsive behavior into a
schema-validated `SiteDocument`. Owned mode may retain visible identity; inspiration mode removes
source identity, images, and wording.

## Safe access ladder

1. Public HTTPS capture.
2. A dedicated, least-privileged same-origin test account.
3. A short owner-controlled Browserless handoff.
4. A different public page, screenshot, Figma design, or future local companion.

Temporary credentials and live browser reconnect details use AES-256-GCM envelopes. They expire and
are cleared after completion, failure, or cancellation. Cross-origin requests never receive managed
headers. CodeRocket does not bypass access controls.

## Durable Studio

`cr_jobs` contains only `site_import` and `site_edit` work. PostgreSQL leases let another worker
resume after a process disappears. Owner-visible progress is stored as bounded milestones; private
capture artifacts expire after 24 hours.

Every successful import or edit creates an immutable `cr_site_revisions` row. The published site at
`/s/:slug` resolves only the revision the owner explicitly selected. A failed or cancelled job
releases its unused reservation and leaves the previous version untouched.

## Connections and data

Simple public payment and booking links work without credentials. Guided provider authorization is
used for Stripe Connect and future account-backed integrations. Managed collections and records are
owner-scoped through RLS and appear only when the requested project outcome needs them.

## Plans and cost boundaries

| Plan | Websites | Creation credits/month | Initial page types | Hosted visits/month |
| --- | ---: | ---: | ---: | ---: |
| Free | 0 | 0 | Demo only | 0 |
| Launch | 1 | 100 | Up to 5 | 20,000 |
| Studio | 10 | 600 shared | Up to 5 each | 250,000 shared |

Work reserves a worst-case provider cost before queueing. One first version costs 20 visible credits;
a guided change costs at most 6; direct form edits are free. Settlement cannot exceed the
reservation, terminal failures return credits, and hosting pauses at the included visit ceiling.

## Deployment boundary

The cloud app and worker run as separate Fly.io processes. Supabase stores account, project,
revision, progress, connection, and billing state. The current controlled renderer publishes safe
immutable site documents; future isolated generated-code runtimes must preserve the same private,
recoverable, explicit-publish contract.
