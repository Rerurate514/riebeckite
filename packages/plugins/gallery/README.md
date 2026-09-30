# @riebeckite/plugin-gallery

Markdown-driven card galleries. A fenced `gallery` code block with a small YAML
body renders as a responsive card grid, which makes theme galleries, project
showcases, and link collections easy to author without HTML.

[日本語](./README_ja.md)

## Overview

````markdown
```gallery
columns: 3
items:
  - title: Default
    description: A calm, readable baseline theme.
    image: /themes/default.png
    href: /themes/default
    meta: v0.1.0
  - title: Gruvbox
    href: /themes/gruvbox
```
````

Each item becomes one card. When `href` is present the card is an `<a>`;
otherwise it is a plain `<div>`. When `image` is absent the card is text-only.
The grid is rendered at build time, so no client-side JavaScript is required.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { gallery } from "@riebeckite/plugin-gallery";

export default defineConfig({
  // ...
  plugins: [gallery()],
});
```

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `language` | `string` | `"gallery"` | Fenced code block language |
| `columns` | `number` | `3` | Default column count |
| `aspect` | `string` | `"4/3"` | Default image aspect ratio |

```ts
gallery({ columns: 4, aspect: "1/1" });
```

## Block fields

| Field | Type | Description |
| ----- | ---- | ----------- |
| `items` | `GalleryItem[]` | Required. The cards, in order |
| `columns` | `number` | Column count. Overrides the plugin option |
| `aspect` | `string` | Image aspect ratio. Overrides the plugin option |

Each `GalleryItem` field is optional, but an item should set at least `title`
or `image`:

| Field | Description |
| ----- | ----------- |
| `image` | Image source URL |
| `alt` | Alternative text. Falls back to `title`, then `""` |
| `title` | Card heading |
| `description` | Supporting copy |
| `href` | Link target. Omitted renders a non-interactive card |
| `meta` | Small trailing label, for example a version or a date |

## Output

```html
<div class="rr-gallery" data-rr-gallery style="--rr-gallery-columns:3;--rr-gallery-aspect:4/3">
  <ul class="rr-gallery__items">
    <li class="rr-gallery__item">
      <a class="rr-gallery__card" href="/themes/default">
        <img class="rr-gallery__image" src="/themes/default.png" alt="Default" loading="lazy" decoding="async">
        <span class="rr-gallery__body">
          <span class="rr-gallery__title">Default</span>
          <span class="rr-gallery__description">A calm, readable baseline theme.</span>
          <span class="rr-gallery__meta">v0.1.0</span>
        </span>
      </a>
    </li>
  </ul>
</div>
```

## Diagnostics

| Code | Severity | Meaning |
| ---- | -------- | ------- |
| `gallery-invalid` | `error` | The body is not valid YAML, is not a mapping, or `items` / `columns` / `aspect` is malformed. The block is replaced by an error box |
| `gallery-item-incomplete` | `warning` | An item has neither a `title` nor an `image` |

`alt` is always emitted on generated images so the output passes
`quality:img-alt-missing`. The plugin also composes with `responsive-image`
(for `srcset`) and `lightbox` (for zoom).

## Style

The package ships `style.css`. Register it like any other plugin stylesheet:

```ts
import "@riebeckite/plugin-gallery/style.css";
```

The grid uses `container-type: inline-size` and collapses to two columns below
`36rem` and one column below `22rem`.

## Exports

- `gallery(options?)` — plugin factory
- `galleryPlugin` — alias of `gallery`
- `parseGallery(source, options)` — parse a block body into a spec
- `renderGallery(spec)` / `renderGalleryError(message)` — render the grid or an error box
- `remarkGallery(options?)` — the remark transform
- `resolveGalleryOptions(options?)` — apply option defaults
- Constants: `GALLERY_PLUGIN_NAME`, `GALLERY_CLASS`, `GALLERY_ATTRIBUTE`, `DEFAULT_GALLERY_COLUMNS`, `DEFAULT_GALLERY_ASPECT`
- Types: `GalleryOptions`, `GalleryItem`, `GallerySpec`, `GalleryParseResult`, `GalleryWarning`, `ResolvedGalleryOptions`

## Limitations

- Items are static data. Filtering or querying the content manifest is out of
  scope; use the `query` plugin's table/cards output for that.
- The container-query collapse targets the default multi-column layout. A block
  that explicitly sets `columns: 1` is unaffected visually.

## See also

- [Plugin guide](../../../docs/en/plugin-system.md)
