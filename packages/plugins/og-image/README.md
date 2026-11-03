# @riebeckite/plugin-og-image

<!-- Generated from docs/docs/plugins/og-image.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Generates static 1200×630 PNG Open Graph images for public and unlisted content.

[日本語](./README_ja.md)

## Usage

```ts
import { ogImage } from "@riebeckite/plugin-og-image";

export default defineConfig({
  plugins: [ogImage({ preset: "card" })],
});
```

`card`, `minimal`, and `editorial` presets are available. The renderer uses
Sharp and SVG text, including Japanese text when an appropriate system font is
available.

## Precedence and output

An explicit `ogImage` or `image` frontmatter value is never changed. Otherwise,
the plugin assigns a fingerprinted `/_og/*.png` path and registers it as a
deferred generated output. Only routable public content can produce an image;
draft and not-yet-published content cannot be exposed through this path.

The existing SEO provider reads `frontmatter.ogImage` before `image` and the
site default, so no second SEO provider or duplicate Open Graph tag is added.

## Cache behavior

The renderer runs only after the SSG output plan marks the PNG affected. An
unchanged cached output is reused without running Sharp. The output fingerprint
includes the page identity, selected appearance/content settings, and renderer
version.

## Custom layout

Pass a function that returns SVG body markup. Supply `layoutFingerprint` with a
version that you change whenever that function changes.

```ts
ogImage({
  layoutFingerprint: "brand-layout-v2",
  layout: ({ page, palette }) =>
    `<rect width="1200" height="630" fill="${palette.background}"/><text x="80" y="240" fill="${palette.foreground}" font-size="72">${page.title}</text>`,
});
```
