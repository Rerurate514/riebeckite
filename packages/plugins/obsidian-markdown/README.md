# @riebeckite/plugin-obsidian-markdown

<!-- Generated from docs/docs/plugins/obsidian-markdown.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Obsidian-flavored Markdown support: wikilinks, callouts, inline tags, and
block references.

[日本語](./README_ja.md)

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

- `[Note](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/Note.md)` → link to the target's resolved canonical permalink
  (`ContentManifestEntry.permalink`) with class `rr-obsidian-wikilink`. Alias
  with `[Alias](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/Note.md)`. The target is looked up by slug; the `href` is the
  resolved permalink
- Fragments: `[Note#Heading](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/Note.md#Heading)` → `#heading-slug`,
  `[Note#^block-id](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/Note.md#^block-id)` → `#block-id`
- `![Note](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/Note.md)` → note embed. The core pipeline renders the target note
  recursively (max depth 3, cycle-safe). Unresolved embeds render a
  placeholder link or text
- `![image.png](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/image.png.md)` → `<img>` under `assetBase`
- `[image.png](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/image.png.md)` → link to the asset URL
- `[file.pdf](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/file.pdf.md)` / `![file.pdf](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/file.pdf.md)` → rendered by a plugin that provides
  `renderAttachment` (see `@riebeckite/plugin-attachment`), otherwise a plain
  download link
- Unresolvable targets → link with class `rr-obsidian-wikilink--broken`

Embedded notes, images, and unresolved embeds receive default Plugin CSS. Note
embeds include visible `Embedded: <slug>` text rather than generated content so
the label is available to assistive technology.

### Callouts

```md
> [!note] Optional title
> Callout content.

> [!warning]- Collapsed by default
> More content.
```

Output: `div.rr-callout.rr-callout--{type}` with `data-callout`, plus
`rr-callout--collapsible` / `rr-callout--collapsed` for `+` / `-` markers. Titles fall back to
built-in defaults (`note`, `tip`, `warning`, `danger`, `bug`, `quote`, ...).

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

**WikiLinks and fragments.** A link to [README](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/themes/README.md), an aliased link to [the Plugin catalog](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/plugins/README.md), and a heading link to [plugins/showcase#Inline](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/plugins/showcase.md#Inline).

**Embeds.** A note embed and an image embed:

![head-tag](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/glossary/head-tag.md)

![riebeckite-logo-horizontal.png](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/riebeckite-logo-horizontal.png.md)

**Tags.** Inline tags such as #documentation and #plugins link to the taxonomy pages.

**Block references.** This paragraph carries a block id.

^live-example-block

Another note can target it with `[obsidian-markdown#^live-example-block](./README.md#^live-example-block)`.

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

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
- [`@riebeckite/plugin-attachment`](../attachment/README.md)
