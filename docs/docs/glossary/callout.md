---
date: 2026-10-14
title: Callout
sidebar:
  hidden: true
---

# Callout
A callout box using container shortcode syntax `:::callout[Title]{type=warning}` or `:::note[Title]{type=info}`, rendering as a `div` with CSS classes `rr-callout rr-callout--{type}` and built-in default titles.

## Callout syntax
```md
:::callout[Warning]{type=warning}
More content.
:::
```

```md
:::callout[Note]{type=note}
This is a note callout.
:::
```
Output: `div.rr-callout.rr-callout--note` with `data-callout`.
Titles fall back to built-in defaults (`note`, `tip`, `warning`, `danger`, `bug`, `quote`).

## Callout types
Built-in callout types and their default titles:

- `note` / `note` → default title "Note"
- `tip` → default title "Tip"
- `warning` → default title "Warning"
- `danger` → default title "Danger"
- `bug` → default title "Bug"
- `quote` → default title "Quote"

## Custom titles and styles
Provide an optional title in the shortcode: `:::callout[My Title]{type=warning}`.

Override default titles via `callout.defaultTitles` option when registering the plugin:
```ts
callout: {
  defaultTitles: {
    warning: "注意",
  },
}
```

## Obsidian Markdown callout integration
The `@riebeckite/plugin-obsidian-markdown` plugin also parses Obsidian-style callout blockquotes (`> [!NOTE]`, `> [!WARNING]`, etc.) and converts them to the same `rr-callout` CSS classes. This allows callouts written in Obsidian Markdown to render identically in Riebeckite without using the shortcode syntax.

## Related terms
- [[glossary/obsidian-vault|Obsidian Vault]]
- [[tag|Tag]]
- [[shortcode|Shortcode]]
- [[sidenote|Sidenote]]
- [[backlink|Backlink]]
- [[glossary/site|Site]]
- [[glossary/ui|UI]]

## Learn more
- [Obsidian Markdown](../plugins/obsidian-markdown.md)