# Responsive Image

Upgrades existing `<img>` elements with lazy loading and responsive
`<picture>` / `srcset` markup, using only image variants that are already
present in the content manifest.

[日本語](./responsive-image.ja.md)

## Overview

`responsiveImage()` runs as a build-time HTML layer:

1. It always adds `loading="lazy"` and `decoding="async"` to `<img>` elements
   unless those attributes are already set.
2. It adds a `sizes` attribute when one is missing.
3. It looks for sibling variants that already exist in the manifest
   (`photo.webp`, `photo.avif`, `photo-640.webp`, `photo-640.png`, …). When
   variants are found the `<img>` becomes a `<picture>` element with grouped
   `<source>` elements. When no variants are found the `<img>` is left in place
   with just the added attributes.

The plugin never fabricates URLs and never writes files. It only references
assets that the manifest already knows about.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { attachment } from "@riebeckite/plugin-attachment";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { responsiveImage } from "@riebeckite/plugin-responsive-image";

export default defineConfig({
  // ...
  plugins: [obsidianMarkdown(), attachment(), responsiveImage()],
});
```

`responsiveImage()` uses `order: 100`, so it runs after the media and
attachment renderers.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `lazy` | `boolean` | `true` | Adds `loading="lazy"` when absent |
| `decoding` | `boolean` | `true` | Adds `decoding="async"` when absent |
| `sizes` | `string` | `"100vw"` | Fallback `sizes` value added when absent |
| `widths` | `number[]` | `[640, 1280, 1920]` | Width variants to look up |
| `formats` | `string[]` | `["webp", "avif"]` | Format variants to look up |
| `className` | `string` | `"rb-responsive-image"` | Class applied to `<picture>` |
| `generate` | `boolean` | `false` | Reserved |
| `outputDir` | `string` | unset | Reserved |

## Variant discovery

Variants are matched against the asset paths the manifest already contains:

- format variants: `photo.webp`, `photo.avif`
- width variants: `photo-640.webp`, `photo-1280.avif`, `photo-1920.png`
- width variants in the original format: `photo-640.png`

The plugin maps the original `<img src>` back to a manifest asset by trying the
site asset URL (`/attachments/photo.png`) and the attachment URL
(`/assets/attachments/photo.png`). If the source cannot be matched to a manifest
asset, the `<img>` is left untouched.

## Limitation: no image encoding

This plugin is a deterministic discovery/HTML layer. It does **not** encode or
generate new image files by default. `PluginAsset` only supports `style` and
`script` module specifiers, so Core currently exposes no supported way for a
plugin to emit arbitrary binary files into the build output.

`generate` and `outputDir` are reserved for a future release and do nothing
today. Adding real encoding requires a Core file-emission API; until then,
pre-generate the variants yourself (for example with an external image tool) and
commit them next to the original image. Sites copy referenced vault assets into
`public/` through `apps/web/scripts/build_images.ts`.

## Exports

- `responsiveImage(options?)` / `responsiveImagePlugin` — plugin factory
- `resolveResponsiveImageOptions(options?)` — resolve defaults
- `buildResponsiveSrcset(existingPaths, src, options?)` — pure srcset planner
- `applyResponsiveImages(html, existingPaths, options?)` — HTML transform
- `collectKnownAssetPaths(manifest)` — manifest asset set helper
- Types: `ResponsiveImageOptions`, `ResolvedResponsiveImageOptions`,
  `ResponsiveImagePlan`, `ResponsiveImageSource`, `ResponsiveImageVariant`

## See also

- [Plugin guide](../reference/plugin-api.md)
