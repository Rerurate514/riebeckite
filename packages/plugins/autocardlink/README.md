# @riebeckite/plugin-autocardlink

Render `cardlink` code blocks as link preview cards.

[日本語](./README_ja.md)

## Overview

`autoCardLinkPlugin()` replaces fenced `cardlink` code blocks with an
anchor-style link card (title, description, favicon, host, and an optional
image). Styles ship in `style.css`.

```cardlink
url: https://example.com/post
title: "Example post"
description: "A short summary of the linked page."
host: example.com
favicon: https://example.com/favicon.ico
image: https://example.com/og.png
```

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { autoCardLinkPlugin } from "@riebeckite/plugin-autocardlink";

export default defineConfig({
  // ...
  plugins: [autoCardLinkPlugin()],
});
```

## Syntax

````
```cardlink
url: https://example.com/post
title: "Example post"
description: "A short summary of the linked page."
host: example.com
favicon: https://example.com/favicon.ico
image: https://example.com/og.png
```
````

| Field | Description |
| ----- | ----------- |
| `url` | Link target. Required — blocks without `url` are left untouched |
| `title` | Card title (double quotes optional). Falls back to `url` |
| `description` | Card description (double quotes optional) |
| `host` | Host label. Defaults to the `url` hostname; falls back to `url` when the hostname cannot be parsed |
| `favicon` | Favicon image URL |
| `image` | Preview image URL. Without it the card uses the no-image layout |

`title` and `description` may be wrapped in double quotes; escaped quotes
(`\"`) inside them are unescaped. `url`, `image`, and `favicon` must use an
`http(s)` or relative URL — unsafe schemes such as `javascript:` are rejected
(the whole block is skipped for `url`, and the asset is dropped otherwise).

Rendered cards open in a new tab (`target="_blank" rel="noopener
noreferrer"`). The preview image and favicon are lazy-loaded and marked
`data-lightbox-ignore="true"` so they are skipped by
`@riebeckite/plugin-lightbox`.

Each card is a `div.rr-cardlink` container holding the card link
(`a.rr-cardlink__card`) and a copy button (`button.rr-cardlink__copy`) that
copies the URL to the clipboard. The copy button appears on hover/focus on
desktop and is always visible on touch devices. Cards respond to container
queries: at narrow widths the description is hidden first, then the preview
image.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `className` | `string` | `(none)` | Extra CSS class added to the card root. The `rr-cardlink` hook is always applied |

## Exports

- `autoCardLinkPlugin(options?)` — plugin factory
- `remarkAutoCardLink(options?)` — remark transform usable on its own
- Types: `AutoCardLink`, `AutoCardLinkOptions`

## Not supported (yet)

The card is built only from the fields written in the fenced block. It does not
fetch the target page, so it never derives metadata on its own. In particular:

- Local Obsidian image embeds such as `[[image.png]]` are not resolved; `image`
  and `favicon` accept URLs only.
- Wikilinks are not resolved inside `favicon` or `image`.
- The Obsidian Auto Card Link `data-auto-card-link-depth` option is not
  implemented.
- Open Graph metadata is not fetched or cached; `title`, `description`, and
  `image` must be authored explicitly.

## See also

- [Plugin guide](../../../docs/docs/reference/plugin-api.en.md)
