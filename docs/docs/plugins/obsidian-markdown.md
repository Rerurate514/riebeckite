---
date: 2026-10-06
title: Obsidian Markdown
---
# Obsidian Markdown

Obsidian-flavored Markdown support: wikilinks, callouts, inline tags, and
block references.

[日本語](./obsidian-markdown.ja.md)

## Overview

`obsidianMarkdown()` registers remark transforms that convert Obsidian syntax
during the build. It runs with `order: -20` so it processes content before
other Markdown plugins.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";

export default defineConfig({
  // ...
  plugins: [obsidianMarkdown()],
});
```

## Syntax

### Wikilinks

- `[[Note]]`, `[[Note|Alias]]`, `[[folder/Note]]` → link to the target's
  resolved canonical permalink (`ContentManifestEntry.permalink`) with class
  `rr-obsidian-wikilink`. The target is looked up in the content index; the
  `href` is the resolved permalink
- Same-page fragments: `[[#Heading]]` and `[[#^block-id]]` link within the
  current note. They are resolved independently from note targets and keep the
  current note's permalink
- Cross-note fragments: `[[Note#Heading]]` → `#heading-slug`,
  `[[Note#^block-id]]` → `#block-id`, `[[Note#Heading|Alias]]` keeps the alias.
  Without an alias the link text follows Obsidian: `Note > Heading`
- `![[Note]]` → note embed. The core pipeline renders the target note
  recursively (max depth 3, cycle-safe). Unresolved embeds render a
  placeholder link or text
- `![[Note#Heading]]` / `![[Note#^block-id]]` → embed only that section or
  block. Heading sections run until the next heading of the same or higher
  level; block boundaries follow Obsidian (a marker on its own line belongs to
  the preceding block, a marker directly after a list item belongs to that
  item). `![[#Heading]]` embeds a section of the current note
- `![[image.png]]` → `<img>` under `assetBase`
- `![[image.png|300]]` / `![[image.png|300x200]]` → width and height
  attributes; `![[image.png|Description]]` → alt text. Only positive integers
  are accepted as dimensions
- `[[image.png]]` → link to the asset URL
- `[[file.pdf]]` / `![[file.pdf]]` → rendered by a plugin that provides
  `renderAttachment` (see `@riebeckite/plugin-attachment`), otherwise a plain
  download link
- Unresolvable targets → link with class `rr-obsidian-wikilink--broken`

Embedded notes, images, and unresolved embeds receive default Plugin CSS. Note
embeds include visible `Embedded: <slug>` text rather than generated content so
the label is available to assistive technology.

### Comments

`%% comment %%` is removed from the output, also when the comment spans several
lines. Comments inside inline code and fenced code blocks are preserved, as in
Obsidian.

### Callouts

```md
> [!note] Optional title
> Callout content.

> [!warning]- Collapsed by default
> More content.
```

Output: `div.rr-callout.rr-callout--{type}` with `data-callout`. A `+` or `-`
marker renders `details.rr-callout.rr-callout--collapsible` with a
`summary.rr-callout__title`; `+` adds the `open` attribute and `-` starts
collapsed. Folding uses the native `details` element, so no client script is
loaded. Titles fall back to built-in defaults (`note`, `tip`, `warning`,
`danger`, `bug`, `quote`, ...).

Themes can customize a callout from its `rr-callout` root with
`--rr-callout-title-color`, `--rr-callout-title-font-family`,
`--rr-callout-title-font-size`, `--rr-callout-title-font-weight`,
`--rr-callout-title-letter-spacing`, `--rr-callout-title-text-transform`, and
`--rr-callout-icon-color`; they must not select callout descendants.

### Inline tags

- `#tag`, `#nested/tag` → link to `{tagBase}{slugified tag}` with class `tag`
  and `data-tag`
- Purely numeric tags are ignored; trailing `/` and `-` are stripped
- Each tag also triggers the optional `onTag` callback

### Block references

- A trailing `^block-id` on a block is removed from the text and applied to
  the element as `id` and `data-block-id`
- The `id` is assigned after HTML sanitization so anchors stay stable:
  `[[Note#^block-id]]` resolves to `#block-id`. Duplicate ids in one document
  receive numeric suffixes

## Compatibility

| Feature | Obsidian Support | Riebeckite Support | Notes |
| --- | --- | --- | --- |
| `[[Note]]`, `[[Note\|Alias]]` | Supported | Full | |
| `[[folder/Note]]` | Supported | Full | resolved through the content index |
| `[[Note#Heading]]` | Supported | Full | |
| `[[Note#^block-id]]` | Supported | Full | |
| `[[#Heading]]`, `[[#^block-id]]` | Supported | Full | same-note links |
| Link text `Note > Heading` | Supported | Full | alias overrides it |
| `![[image.png]]` | Supported | Full | |
| `![[image.png\|300]]`, `\|300x200` | Supported | Full | positive integers only |
| `![[image.png\|Description]]` | Supported | Full | alt text |
| `![[Note]]` | Supported | Full | |
| `![[Note#Heading]]` | Supported | Full | section until the next peer heading |
| `![[Note#^block-id]]` | Supported | Full | |
| `![[#Heading]]` | Supported | Full | same-note embed |
| `%% comment %%` | Supported | Full | multi-line supported, code preserves it |
| Callouts | Supported | Full | |
| Collapsible callouts | Supported | Full | native `details` / `summary`, no client script |
| Nested callouts | Supported | Full | |
| Callout icons | Supported | Partial | typed color styling, not the Obsidian icon set |
| Embed depth | Supported | Partial | limited to 3 levels |

## Live example

The forms below are rendered by this site.

**Callout types.** `note`, `tip`, `warning`, `danger`, and `quote` share the same block-quote syntax.

> [!note] Note
> A note callout.

> [!tip] Tip
> A tip callout.

> [!warning] Warning
> A warning callout.

> [!danger] Danger
> A danger callout.

> [!quote] Quote
> A quote callout.

**WikiLinks and fragments.** A link to [[README]], an aliased link to [[plugins/README|the Plugin catalog]], and a heading link to [[plugins/showcase#Inline]].

**Embeds.** A note embed and an image embed:

![[head-tag]]

![[riebeckite-logo-horizontal.png]]

**Tags.** Inline tags such as #documentation and #plugins link to the taxonomy pages.

**Block references.** This paragraph carries a block id.

^live-example-block

Another note can target it with `[[obsidian-markdown#^live-example-block]]`.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `assetBase` | `string` | `"/"` | Base path for image wikilink URLs |
| `callout.defaultTitles` | `Record<string, string>` | built-in map | Override default callout titles |
| `tag.tagBase` | `string` | `"/tags/"` | Tag page base path |
| `tag.onTag` | `(tag: string) => void` | — | Called for every tag found |

## Exports

- `obsidianMarkdown(options?)` / `obsidianMarkdown` — plugin factory
- Types: `ObsidianMarkdownOptions`, `CalloutOptions`, `TagOptions`,
  `WikilinkOptions`, `WikilinkFragment`

## See also

- [Plugin guide](../reference/plugin-api.md)
- [`@riebeckite/plugin-attachment`](./attachment.md)
