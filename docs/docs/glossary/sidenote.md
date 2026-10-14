---
title: Sidenote
sidebar:
  hidden: true
---

# Sidenote

Tufte-style side notes that rewrite footnote markup into inline references and margin notes (desktop) or popovers (mobile), using a small client entry (`initSidenotes`) to toggle mobile popover behavior.

## Footnote syntax

Write normal GFM footnotes:

```md
Riebeckite renders margin notes at the side of the text.[^1]

[^1]: The note text appears beside the reference on desktop and in a popover on mobile.
```

## Sidenote rendering

- Each footnote reference becomes a `sup` with a small reference link (`[data-rr-sidenotes-ref]`) keeping `href="#fn-…"` target.

- Each footnote definition becomes a `.rr-sidenotes__note` aside next to the reference:
  - Inline note from tablet width (`@media (min-width: 48rem)`)
  - Sticky margin note when there is room for an article rail (`@media (min-width: 88rem)`)
  - Popover on mobile (`@media (max-width: 48rem)`)

## Client initialization

A small client entry (`initSidenotes`) toggles the mobile popover: tap to open/close, `Escape` to close, and click outside to close.

It ignores the page when `(min-width: 48rem)` matches — desktop margin notes need no JavaScript.

```ts
import { initSidenotes } from "@riebeckite/plugin-sidenotes";
```

### Client options
`initSidenotes` accepts configurable options:

- **selector**: CSS selector for reference links. Defaults to `[data-rr-sidenotes-ref]`.
- **openLabel**: Accessible label prefix when the popover is closed. Defaults to `"Footnote"`.
- **closeLabel**: Accessible label prefix when the popover is open. Defaults to `"Close sidenote"`.

```ts
import { initSidenotes } from "@riebeckite/plugin-sidenotes";
initSidenotes({
  selector: ".custom-ref",
  openLabel: "脚注",
  closeLabel: "閉じる",
});
```

## Related terms

- [[glossary/obsidian-vault|Obsidian Vault]]
- [[tag|Tag]]
- [[shortcode|Shortcode]]
- [[callout|Callout]]
- [[backlink|Backlink]]
- [[glossary/site|Site]]
- [[glossary/ui|UI]]

## Learn more

- [Sidenotes](../plugins/sidenotes.md)
