# Render custom OG layouts with Satori

- **Status:** Accepted
- **Date:** 2026-11-03

## Context

The original renderer accepted SVG strings only. That made arbitrary TSX layouts, deterministic Japanese text, and reliable line wrapping unavailable.

## Decision

Use Satori to turn Hono JSX-compatible TSX layouts into SVG, then keep Sharp as the existing PNG encoder. Bundle Noto Sans JP regular and bold WOFF files with `@riebeckite/og-image`; the font is OFL-1.1 and is loaded by package-relative URL. TSX layout source and static imports are bundled through esbuild and fingerprinted before output planning.

## Alternatives

Using system fonts was rejected because image output varied by host. SVG string templates were retained for compatibility but rejected as the primary custom-layout API. A browser renderer was rejected because it would add a browser process to static builds.

## Consequences

Custom layouts use Satori's CSS subset, not arbitrary browser CSS. The renderer remains Node-only and is only reachable from the build-time plugin, so Workers bundles do not include Sharp, Satori, or the fonts.
