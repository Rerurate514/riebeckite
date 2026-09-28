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
| `title` | Card title (double quotes optional). Falls back to `url` |
| `description` | Card description (double quotes optional) |
| `host` | Host label. Falls back to `url` |
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

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `className` | `string` | `(none)` | Extra CSS class added to the card root. The `rr-cardlink` hook is always applied |

## Exports

- `autoCardLinkPlugin(options?)` — plugin factory
- `remarkAutoCardLink(options?)` — remark transform usable on its own
- Types: `AutoCardLink`, `AutoCardLinkOptions`

## See also

- [Plugin guide](../../../docs/en/plugin-system.md)
