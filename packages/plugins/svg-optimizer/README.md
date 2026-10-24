# @riebeckite/plugin-svg-optimizer

<!-- Generated from docs/docs/plugins/svg-optimizer.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Reduces the size of public SVG assets with SVGO while keeping the original
public URL.

[日本語](./README_ja.md)

## Usage

```ts
import { svgOptimizer } from "@riebeckite/plugin-svg-optimizer";

export default defineConfig({
  plugins: [
    svgOptimizer({
      multipass: true,
      preserveViewBox: true,
      preserveAccessibility: true,
    }),
  ],
});
```

The plugin handles `.svg` assets referenced from routable public and unlisted
Markdown, including standard Markdown images and Obsidian image embeds. The
optimized bytes replace the original at the same path, so existing links such as
`/images/diagram.svg` keep working.

## Output

SVGO removes comments, editor metadata, redundant attributes, and unused
elements. The default configuration keeps `viewBox`, gradients, masks,
clip paths, element IDs, `title`, `desc`, ARIA attributes, and ID references.

An optimized result is used only when it is smaller than the source. Otherwise
the original file is emitted unchanged, and the decision is cached.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `multipass` | `boolean` | `true` | Run SVGO repeatedly until the output stops shrinking |
| `preserveViewBox` | `boolean` | `true` | Keep the `viewBox` attribute |
| `preserveAccessibility` | `boolean` | `true` | Keep `title`, `desc`, and accessibility attributes |
| `keepOriginal` | `boolean` | `false` | Skip optimization and serve the source SVG |

All options are optional. With the defaults, an SVG is optimized whenever the
result is smaller.

## Failure behavior

Unreadable files, invalid UTF-8, malformed XML, and SVG larger than 10 MiB are
left untouched and reported with a warning. A failed optimization never fails
the build and never removes the original asset. Unchanged input reuses the
plugin cache, so the same SVG is not optimized again on a no-change build.

## Security

Optimization is not sanitization. The plugin refuses to optimize an SVG that
contains scripts, embedded HTML, event handlers, external references, CSS
imports, external entities, or dangerous URI schemes. Such a file is served
unchanged with a warning. Use a separate sanitization step if SVG from an
untrusted source must be made safe.

## Boundaries

Only assets referenced by public or unlisted entries reach the transform.
Draft and scheduled entries are not read or emitted. The plugin ignores every
file that is not an SVG, so it can run alongside
[Image Optimizer](../image-optimizer/README.md) without competing for the same inputs.
