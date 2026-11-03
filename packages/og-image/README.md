# @riebeckite/og-image

Static 1200×630 PNG Open Graph image rendering primitives for Riebeckite.

[日本語](./README_ja.md)

Use `presetLayout("card")`, `presetLayout("minimal")`, or
`presetLayout("editorial")` with `renderOgImage()`. The renderer turns Hono JSX
layouts into SVG with Satori, then encodes PNG with Sharp.
