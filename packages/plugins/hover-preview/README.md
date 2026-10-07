# @riebeckite/plugin-hover-preview

Quartz/Obsidian-Publish style popover previews for internal links. Hovering or
focusing a note link shows its title and a short excerpt without leaving the
page.

[日本語](./README_ja.md)

## Overview

At build time `hoverPreviewPlugin()` builds a preview index from the content
manifest (`permalink` → `{ title, excerpt, slug }`) and injects it once into
every page that contains internal links as an inert
`<script type="application/json" data-rb-hover-preview>` block. The client
entry `initHoverPreview` reads that payload and attaches hover, focus, and touch
handlers to the matching links.

The excerpt is plain text extracted from the rendered HTML: tags are stripped,
whitespace is collapsed, and the result is truncated to `excerptLength`
characters. Pages without internal links are left untouched, and the payload is
bounded by `maxEntries` when set.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { hoverPreviewPlugin } from "@riebeckite/plugin-hover-preview";

export default defineConfig({
  // ...
  plugins: [hoverPreviewPlugin()],
});
```

`hoverPreviewPlugin()` registers the style asset, the client entry, and the
build-time payload injection. `hoverPreview` is an alias of the same factory.

The client entry takes no arguments. Behavior is carried by data attributes on
the payload script, so the plugin works even when the client initializer is
called without options.

## Options

| Option          | Default        | Description                                            |
| --------------- | -------------- | ------------------------------------------------------ |
| `delay`         | `120`          | Milliseconds before the popover appears.               |
| `excerptLength` | `160`          | Maximum excerpt length in characters.                  |
| `maxEntries`    | unset          | Upper bound on entries stored in the page payload.     |
| `selector`      | `a[href^="/"]` | Selector for internal links that receive a preview.    |
| `className`     | `rb-hover-preview` | Base class of the popover element.                 |
| `includeTitles` | `true`         | Whether the popover shows the target entry title.      |

```ts
hoverPreviewPlugin({
  delay: 200,
  excerptLength: 120,
  maxEntries: 200,
  selector: 'a[href^="/notes/"]',
});
```

## API

- `hoverPreviewPlugin(options?)` — plugin factory
- `hoverPreview` — alias of `hoverPreviewPlugin`
- `resolveHoverPreviewOptions(options?)` — applies defaults and returns a
  `ResolvedHoverPreviewOptions`
- `buildPreviewIndex(entries, options)` — builds a `HoverPreviewIndex`
  (`permalink` → `{ title, excerpt, slug }`)
- `htmlToPlainText(html)` / `createExcerpt(html, length)` — excerpt helpers
- `initHoverPreview()` — browser initializer (also via
  `@riebeckite/plugin-hover-preview/client`)
- Constants: `HOVER_PREVIEW_ATTRIBUTE`, `HOVER_PREVIEW_SCRIPT_ID`
- Types: `HoverPreviewOptions`, `ResolvedHoverPreviewOptions`,
  `HoverPreviewEntry`, `HoverPreviewIndex`

## See also

- [Plugin guide](../../../docs/docs/reference/plugin-api.md)

