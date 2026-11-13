---
date: 2026-10-06
title: Attachment
---
# Attachment

Attachment link and embed card rendering for Obsidian wikilinks.

[日本語](./attachment.ja.md)

## Overview

`attachment()` provides the `renderAttachment` hook that
`@riebeckite/plugin-obsidian-markdown` uses when a wikilink resolves to a
non-image file (`[[report.pdf]]`, `![[report.pdf]]`, ...).

Without this plugin, those wikilinks fall back to a plain download link.

## Installation

```sh
npm install @riebeckite/plugin-attachment
```

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { attachment } from "@riebeckite/plugin-attachment";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";

export default defineConfig({
  // ...
  plugins: [obsidianMarkdown(), attachment()],
});
```

## Live example

The following source is rendered on this page. A plain wikilink becomes a download link, and an embedded text file becomes a code block preview with a download footer.

### Source

````md
[[attachment-example.txt]]

![[attachment-example.txt]]
````

### Rendered

[[attachment-example.txt]]

![[attachment-example.txt]]

- Format is the uppercased file extension.
- Size is read from disk under `config.content.directory` (path-traversal safe)
  and omitted when the file cannot be read.
- Text attachments in the preview extensions render as an escaped code block
  followed by the file name, format, size, and download link. Files over
  256 KiB, binary files, and files that are not valid UTF-8 fall back to the
  attachment card.
- The embed carries the stable `rr-attachment` root hook, and inline
  attachment links use `rr-attachment-link`.

Styles ship in `style.css` (inline attachment links also get a `↓` suffix).

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `showSize` | `boolean` | `true` | Read the file size and show it in the embed card |
| `preview` | `readonly string[] \| false` | `["txt", "log", "csv", "tsv", "json", "yaml", "yml", "toml", "ini", "xml"]` | Extensions rendered as inline code block previews; pass `false` to disable previews |

## Exports

- `attachment(options?)` / `attachment` — plugin factory
- Type: `AttachmentOptions`

## See also

- [Plugin guide](../reference/plugin-api.md)
- [`@riebeckite/plugin-obsidian-markdown`](./obsidian-markdown.md)
