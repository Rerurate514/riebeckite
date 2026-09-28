# @riebeckite/plugin-media

Renders Obsidian audio / video attachment embeds with native HTML5 media players.

[日本語](./README_ja.md)

## Overview

`media()` provides an attachment renderer for common Web media formats such as
`![[music.mp3]]` and `![[movie.mp4]]`. Unsupported files return `null`, allowing
later renderers or the default fallback to handle them.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { attachment } from "@riebeckite/plugin-attachment";
import { media } from "@riebeckite/plugin-media";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";

export default defineConfig({
  // ...
  plugins: [obsidianMarkdown(), media(), attachment()],
});
```

`media()` uses `order: -10`, so it runs before the default attachment card.

## Supported formats

- audio: `mp3`, `m4a`, `aac`, `ogg`, `oga`, `opus`, `wav`, `flac`
- video: `mp4`, `m4v`, `webm`, `ogv`, `mov`

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `preload` | `"none" \| "metadata" \| "auto"` | `"none"` when `lazy: true`, otherwise `"metadata"` | `preload` for `<audio>` / `<video>` |
| `lazy` | `boolean` | `true` | Uses `"none"` when `preload` is omitted to reduce eager loading |
| `showCaption` | `boolean` | `true` | Shows a caption |
| `showDownload` | `boolean` | `true` | Shows a download link |
| `showOpenOriginal` | `boolean` | `true` | Shows an original file link |

## Timestamp fragments

When a renderer receives fragments such as `#t=10` or `#10,20`, they are kept on
the media source URL. The current Obsidian wikilink pipeline does not pass
attachment fragments to renderers, so full `![[movie.mp4#t=10]]` support requires
a future pipeline extension.

## Exports

- `media(options?)` / `mediaPlugin` — plugin factory
- Types: `MediaOptions`, `MediaPreload`
