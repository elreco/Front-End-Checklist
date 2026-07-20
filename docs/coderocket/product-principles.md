# CodeRocket product principles

This document defines the durable product and UX contract for CodeRocket. It applies to product
strategy, copy, interaction design, implementation, review, and testing.

## Product promise

CodeRocket turns an existing public website into a safe, editable website that its owner can change
and publish without handling code. Website creation is the primary product journey. Website health
checks remain available as a complementary tool for sites that are already online.

The product must be useful to:

- a site owner who does not write code;
- an agency account manager who needs to explain a result;
- a developer who needs evidence and implementation detail;
- a team that moves between those roles.

These audiences use the same product. The interface should reveal more detail when requested rather
than forcing users to choose a technical or non-technical version of CodeRocket.

## Default journey

The normal starting point is one website address.

```text
Paste the website address
→ CodeRocket studies the visible public pages
→ The user reviews a private, editable first version
→ The user changes what matters and publishes deliberately
```

Creation surfaces must lead with this URL-to-website journey. Website health, check history, and
technical review tools belong under a clearly secondary or optional layer. They must remain
discoverable without receiving the same visual weight as website creation.

Configuration is introduced only when the default attempt proves that it is needed. For example,
protected-page access should appear after CodeRocket detects a blocked page, not as a prerequisite
for every new website.

Good defaults should cover the common case. Optional configuration must be reversible and remain
available without competing with the primary action.

## Information hierarchy

Every important surface should answer these questions in order:

1. What happened?
2. Why does it matter?
3. What should I do now?
4. Where can I see the evidence or technical details?

The first three answers must be understandable without frontend, infrastructure, CI, or security
knowledge.

Technical traceability remains available, but internal identifiers do not belong in the primary
reading path. Examples include ruleset hashes, audit IDs, worker states, prompt versions, cookies,
tokens, and request headers.

Use a plain-language status in the main interface and place exact identifiers under **Technical
details** when they help support, auditing, reproducibility, or development.

## Progressive disclosure

CodeRocket should provide one recommended next action before presenting alternatives.

```text
Recommended action
→ Optional explanation
→ Alternative methods
→ Developer options
→ Raw technical evidence
```

Advanced options should be labelled by purpose, not implementation alone. For example, prefer
“Reach protected pages” over “Configure request headers”.

Opening advanced details must not change the current selection, start a destructive action, or
discard progress.

## Language

Use short sentences, familiar words, and specific outcomes.

Prefer:

- “Some pages could not be opened”
- “Let CodeRocket reach protected pages”
- “Check this website again”
- “Checks version” inside technical details

Avoid in the default journey:

- “ruleset mismatch”
- “runner authentication”
- “inject a session cookie”
- “configure CI headers”
- unexplained provider or protocol terminology

When a technical term is necessary, explain what it accomplishes before naming it.

Buttons describe the action they perform. Error messages explain what failed and offer a concrete
recovery action. Loading messages describe the operation in progress.

## One product for non-developers and developers

Non-developers should be able to:

- create a private first version of a website by pasting one public address;
- change its important wording and actions without seeing source code;
- publish deliberately on managed hosting;
- add and monitor a public website with only its address;
- understand the level and highest-priority problem;
- share a stable result;
- copy a safe request for help without handling secrets;
- know when a developer or provider needs to intervene.

Developers should additionally be able to:

- inspect deterministic evidence;
- access exact rule and check versions;
- configure protected access and secure runners;
- copy structured implementation tasks;
- verify a correction with a fresh check.

Developer power should be available through progressive disclosure, documentation, and copyable
handoffs. It should not make the default experience harder.

## Truth and trust

CodeRocket must distinguish between:

- what it observed;
- what it inferred;
- what it could not verify;
- what requires a fresh check.

Never claim that CodeRocket:

- signed in when it only received a session or restricted credential;
- bypassed a WAF, CAPTCHA, VPN, MFA, or private network automatically;
- fixed a website when it only generated guidance;
- verified pages that were not successfully checked;
- compared results produced by incompatible check versions.

When automation stops, explain the boundary plainly and provide the safest next step.

## Robust interface states

Every new or changed flow must account for:

- initial, loading, success, empty, partial, failed, and retry states;
- slow jobs and background completion;
- duplicate submissions and disabled actions;
- long names, URLs, translated copy, and technical values;
- large result sets with server-side pagination or bounded loading where appropriate;
- filters and sorting that remain shareable in the URL when they define a meaningful view;
- keyboard navigation, visible focus, semantic labels, and screen-reader feedback;
- mobile, tablet, desktop, zoom, and text reflow;
- reduced-motion preferences;
- expired, revoked, or outdated data.

Loading actions must keep their label understandable and prevent accidental repetition. Errors must
remain visible long enough to read and must not erase the user's input.

## Visual design

Use the shared design system and existing interaction patterns. Keep hierarchy strong through
spacing, typography, grouping, and restrained colour rather than adding decorative controls.

The recommended action should be visually dominant. Secondary actions should remain discoverable
without resembling another primary action.

Motion may confirm state or add polish, but it must remain subtle, avoid layout changes, loop only
when appropriate, and respect reduced-motion preferences.

## Definition of done

A CodeRocket product change is complete only when:

- the default path is understandable without technical knowledge;
- the developer path remains available without duplicating the feature;
- all relevant states have deliberate copy and behaviour;
- the interface is keyboard accessible and responsive;
- no internal identifier dominates the main user journey;
- limitations and verification boundaries are truthful;
- automated tests cover the underlying behaviour;
- lint, types, and production build pass;
- the final interface has been inspected in a real browser at relevant viewport sizes.

When a user repeatedly questions a concept or control, treat that as product evidence. Simplify the
interface or update this document and `AGENTS.md` so future work inherits the lesson.
