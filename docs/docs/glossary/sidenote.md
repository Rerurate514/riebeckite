---
title: Sidenote
sidebar:
  hidden: true
---

# Sidenote

Footnote styling that keeps GFM definitions at the end of the article by
default. With `placement: "margin"`, definitions become Tufte-style margin
notes beside their references.

## Footnote syntax

Write normal GFM footnotes:

```md
Riebeckite keeps notes at the end of the article.[^1]

[^1]: The note text appears in the footnote list.
```

## Sidenote rendering

- Default (`placement: "end"`): each reference gets `rr-sidenotes__ref` on its
  `sup` and `rr-sidenotes__toggle` on the link. The trailing
  `<section data-footnotes>` gets `.rr-sidenotes__footnotes` and stays visible
  at every width. Native `href`, `id`, and back-links are preserved.
- `placement: "margin"`: each definition becomes a `.rr-sidenotes__note` aside
  after the nearest block:
  - Inline note in the article flow by default
  - Sticky margin note when there is room for an article rail
    (`@media (min-width: 88rem)`)
  - The trailing definitions section is hidden
- There is no client entry. References and back-links use ordinary anchors.

## Configuration

```ts
import { sidenotes } from "@riebeckite/plugin-sidenotes";

sidenotes(); // definitions at the end of the article
sidenotes({ placement: "margin" }); // Tufte-style margin notes
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
