# @riebeckite/plugin-attachment

Attachment link and embed card rendering for Obsidian wikilinks.

[日本語](./README_ja.md)

## Overview

`attachment()` provides the `renderAttachment` hook that
`@riebeckite/plugin-obsidian-markdown` uses when a wikilink resolves to a
non-image file (`[[report.pdf]]`, `![[report.pdf]]`, ...).

Without this plugin, those wikilinks fall back to a plain download link.

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

## Rendering

### Link (non-embed)

```html
<a class="wikilink wikilink-attachment" href="..." download>label</a>
```

### Embed (`![[file]]`)

```html
<aside class="attachment-card" data-attachment-path="...">
  <div class="attachment-card__meta">
    <span class="attachment-card__format">PDF</span>
    <span class="attachment-card__size">1.2 MB</span>
  </div>
  <div class="attachment-card__name">report.pdf</div>
  <a class="attachment-card__download" href="..." download>label</a>
</aside>
```

- Format is the uppercased file extension
- Size is read from disk under `config.content.directory` (path-traversal
  safe) and omitted when the file cannot be read

Styles ship in `style.css` (inline attachment links also get a `↓` suffix).

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `showSize` | `boolean` | `true` | Read the file size and show it in the embed card |

## Exports

- `attachment(options?)` / `attachmentPlugin` — plugin factory
- Type: `AttachmentOptions`

## See also

- [Plugin guide](../../docs/plugins_en.md)
- [`@riebeckite/plugin-obsidian-markdown`](../plugin-obsidian-markdown/README_en.md)
