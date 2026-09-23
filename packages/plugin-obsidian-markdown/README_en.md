# @riebeckite/plugin-obsidian-markdown

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

- `[[Note]]` → link to `/Note` (class `wikilink`), alias with
  `[[Note|Alias]]`
- Fragments: `[[Note#Heading]]` → `#heading-slug`,
  `[[Note#^block-id]]` → `#block-id`
- `![[Note]]` → note embed. The core pipeline renders the target note
  recursively (max depth 3, cycle-safe). Unresolved embeds render a
  placeholder link or text
- `![[image.png]]` → `<img>` under `assetBase`
- `[[image.png]]` → link to the asset URL
- `[[file.pdf]]` / `![[file.pdf]]` → rendered by a plugin that provides
  `renderAttachment` (see `@riebeckite/plugin-attachment`), otherwise a plain
  download link
- Unresolvable targets → link with class `wikilink wikilink-broken`

### Callouts

```md
> [!note] Optional title
> Callout content.

> [!warning]- Collapsed by default
> More content.
```

Output: `div.callout.callout-{type}` with `data-callout`, plus
`is-collapsible` / `is-collapsed` for `+` / `-` markers. Titles fall back to
built-in defaults (`note`, `tip`, `warning`, `danger`, `bug`, `quote`, ...).

### Inline tags

- `#tag`, `#nested/tag` → link to `{tagBase}{slugified tag}` with class `tag`
  and `data-tag`
- Purely numeric tags are ignored; trailing `/` and `-` are stripped
- Each tag also triggers the optional `onTag` callback

### Block references

- A trailing `^block-id` on a block is removed from the text and applied to
  the element as `id` and `data-block-id`

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `assetBase` | `string` | `"/"` | Base path for image wikilink URLs |
| `callout.defaultTitles` | `Record<string, string>` | built-in map | Override default callout titles |
| `tag.tagBase` | `string` | `"/tags/"` | Tag page base path |
| `tag.onTag` | `(tag: string) => void` | — | Called for every tag found |

## Exports

- `obsidianMarkdown(options?)` / `obsidianMarkdownPlugin` — plugin factory
- Types: `ObsidianMarkdownOptions`, `CalloutOptions`, `TagOptions`,
  `WikilinkOptions`, `WikilinkFragment`

## See also

- [Plugin guide](../../docs/plugins_en.md)
- [`@riebeckite/plugin-attachment`](../plugin-attachment/README_en.md)
