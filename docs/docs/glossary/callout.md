---
date: 2026-10-14
title: Callout
sidebar.hidden: true
---

# Callout
A callout box written with the shortcodes plugin's container syntax: `:::callout[Title]{type=warning}` or `:::note[Title]{type=info}`. The output is a `div.rb-shortcode.rb-shortcode--callout` wrapper around a `div.rb-shortcode__note.rb-shortcode__note--{type}` box.

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
The label (or a `title` attribute) becomes `rb-shortcode__note-title`. Without one, no title is rendered.

## Callout types
`type` is a free-form token used in the `rb-shortcode__note--{type}` class; the shortcodes plugin does not define a fixed list or per-type default titles. Common values are `note`, `tip`, `warning`, `danger`, `bug`, and `quote`.

## Custom titles and styles
Provide an optional title in the shortcode: `:::callout[My Title]{type=warning}`.

The Obsidian Markdown plugin can override its own callout titles:
```ts
plugins: [
  obsidianMarkdown({
    callout: {
      defaultTitles: {
        warning: "注意",
      },
    },
  }),
],
```

## Obsidian Markdown callout integration
The `@riebeckite/plugin-obsidian-markdown` plugin also parses Obsidian-style callout blockquotes (`> [!NOTE]`, `> [!WARNING]`, etc.) and converts them to the same `rr-callout` CSS classes. This allows callouts written in Obsidian Markdown to render identically in Riebeckite without using the shortcode syntax. A `+` or `-` marker renders the callout as a native `details` element, so readers can collapse it without client JavaScript.

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