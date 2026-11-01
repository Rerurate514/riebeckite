---
date: 2026-10-06
title: Media
---
# Media

Renders Obsidian audio / video attachment embeds with native HTML5 media players.

[日本語](./media.ja.md)

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

## Live example

Audio uses the native browser player. Video uses the same embed form with a video extension.

![[media-example.wav]]

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `preload` | `"none" \| "metadata" \| "auto"` | `"none"` when `lazy: true`, otherwise `"metadata"` | `preload` for `<audio>` / `<video>` |
| `lazy` | `boolean` | `true` | Uses `"none"` when `preload` is omitted to reduce eager loading |
| `showCaption` | `boolean` | `true` | Shows a caption |
| `showDownload` | `boolean` | `true` | Shows a download link |
| `showOpenOriginal` | `boolean` | `true` | Shows an original file link |

## Timestamp fragments

Obsidian's time fragments are forwarded to the media source:

```md
![[movie.mp4#t=10]]
![[movie.mp4#t=10,20]]
```

- `t=10` (or `start=10`) starts playback at 10 seconds; `t=10,20` selects the
  range from 10 to 20 seconds
- Values may be seconds (`90`) or `m:ss` / `h:mm:ss`
- The fragment is validated and normalized before it is appended to the source
  URL; invalid parameters are ignored
- `@riebeckite/plugin-obsidian-markdown` passes the fragment to attachment
  renderers, so no extra configuration is needed

## Compatibility

| Feature | Obsidian Support | Riebeckite Support | Notes |
| --- | --- | --- | --- |
| `![[movie.mp4]]` | Supported | Full | |
| `![[music.mp3]]` | Supported | Full | |
| `![[movie.mp4#t=10]]` | Supported | Full | |
| `![[movie.mp4#t=10,20]]` | Supported | Full | |
| Browser codec support | — | Partial | playback depends on the browser; unsupported formats fall back to the attachment card |

## Exports

- `media(options?)` / `media` — plugin factory
- Types: `MediaOptions`, `MediaPreload`

## See also

- [Plugin guide](../reference/plugin-api.md)
