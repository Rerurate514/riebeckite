---
date: 2026-11-03
title: OG Image
---
# OG Image

Generates static 1200×630 PNG Open Graph images for public and unlisted content.

[日本語](./og-image.ja.md)

## Installation

```sh
npm install @riebeckite/plugin-og-image
```

## Usage

```ts
import { ogImage } from "@riebeckite/plugin-og-image";

export default defineConfig({
  plugins: [ogImage({ preset: "card" })],
});
```

`card`, `minimal`, and `editorial` presets are available. The renderer uses
Satori for layout and Sharp for PNG encoding. It bundles Noto Sans JP (OFL-1.1)
for deterministic Japanese rendering on every supported operating system.

## Palette

The image uses the palette declared by the active theme: `palette.light` or
`palette.dark` according to the theme color mode; `system` uses light. Themes
without a palette fall back to a neutral default. Override individual colors
with `appearance`:

```ts
ogImage({ appearance: { accent: "#f66620" } });
```

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

## TSX layout

Pass a TSX file path to use a custom layout. Its source files are bundled during
the build and their fingerprint invalidates only the affected image outputs.

```ts
ogImage({
  layout: "./og-layout.tsx",
});
```

```tsx
import { defineOgLayout } from "@riebeckite/og-image";

export default defineOgLayout(({ page, palette, site }) => (
  <div
    style={{
      backgroundColor: palette.background,
      color: palette.foreground,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      justifyContent: "space-between",
      padding: 64,
      width: "100%",
    }}
  >
    <div>{site.title}</div>
    <div style={{ fontSize: 68, fontWeight: 700 }}>{page.title}</div>
  </div>
));
```

The layout must have a default export. It uses the site's configured Hono JSX
runtime and Satori's supported flexbox CSS subset. A function layout returning
SVG remains supported and requires `layoutFingerprint` for cache invalidation.

## Development Inspector

In development, the **OG images** tab shows the active preset, layout source,
output prefix, and resolved palette. Image output remains deferred until the
static build needs it.
