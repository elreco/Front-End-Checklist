# CodeRocket product principles

## Product promise

CodeRocket turns an existing public website, an explicitly authorized private application, or a
connected Figma design into one coherent editable project. The owner can evolve and publish it
without handling code. The source is a starting model, not a collection of pages to reproduce
independently.

## Default journey

```text
Choose an existing website or Figma design
→ CodeRocket understands representative pages, content patterns, and responsive behavior
→ CodeRocket creates one private, editable project
→ The owner asks for outcomes in plain language and reviews recoverable versions
→ The owner publishes deliberately
```

The existing-website option is selected by default. Figma enters the same project model. Protected
access appears only after the default attempt proves it is needed.

## Prompt-first Studio

The Studio fills the available viewport and keeps the private preview and conversation visible. A
prompt can request a precise visual edit or a broader outcome such as “add a product”, “turn this
into a shop”, or “connect payments”. CodeRocket infers the pages, components, data, and connections
needed, then asks for a decision or provider permission only when it cannot continue safely.

Pages, versions, preview sizes, data, and connections remain compact contextual controls. Manual
field editors and technical panels must not compete with the prompt in the normal journey. Every
accepted change creates a recoverable immutable version.

## Generated project model

Representative routes and repeated content patterns become shared layouts, reusable components,
structured content, assets, and provider connections. Framework and deployment details remain
implementation choices. The normal interface describes the resulting capability.

A public payment or booking URL is a link, not an authorized provider connection. When an account
connection is required, offer one clear authorization action.

## Information hierarchy

Every important surface answers, in order:

1. What happened?
2. Why does it matter?
3. What should I do now?
4. Where can I inspect technical details?

The first three answers must not require frontend, infrastructure, or AI knowledge. Queue states,
worker IDs, tokens, cookies, headers, and model configuration stay behind technical details.

## Truth and trust

CodeRocket distinguishes what it observed, inferred, could not access, and needs the owner to
confirm. It never claims to bypass authentication, CAPTCHA, MFA, passkeys, VPNs, WAFs, or private
networks. It never calls a pasted link a provider connection, and never publishes a generated
version without an explicit owner action.

## Robust interface states

Every changed flow covers loading, empty, partial, success, error, retry, slow jobs, duplicate
submissions, long values, keyboard use, responsive layouts, and reduced motion. Advanced capability
can expand, but the default path keeps one obvious next action.

## Definition of done

- The default path is understandable without technical knowledge.
- Limitations and access boundaries are stated accurately.
- Owner data remains private and generated changes are recoverable.
- Relevant automated tests, lint, types, and production build pass.
- Material interface changes are inspected in a real browser at desktop and mobile sizes.
