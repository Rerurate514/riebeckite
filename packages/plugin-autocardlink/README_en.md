# @riebeckite/plugin-autocardlink

Render `cardlink` code blocks as link preview cards.

[日本語](./README_ja.md)

## Overview

`autoCardLinkPlugin()` replaces fenced `cardlink` code blocks with an
anchor-style link card (title, description, favicon, host, and an optional
image). Styles ship in `style.css`.

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
| `title` | Card title (quoted values allowed). Falls back to `url` |
| `description` | Card description (quoted values allowed) |
| `host` | Host label. Falls back to `url` |
| `favicon` | Favicon image URL |
| `image` | Preview image URL. Without it the card uses the no-image layout |

Rendered cards open in a new tab (`target="_blank" rel="noopener
noreferrer"`). The preview image and favicon are lazy-loaded and marked
`data-lightbox-ignore="true"` so they are skipped by
`@riebeckite/plugin-lightbox`.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `className` | `string` | `"rr-cardlink"` | Root CSS class of the card |

## Exports

- `autoCardLinkPlugin(options?)` — plugin factory
- `remarkAutoCardLink(options?)` — remark transform usable on its own
- Types: `AutoCardLink`, `AutoCardLinkOptions`

## See also

- [Plugin guide](../../docs/plugins_en.md)
