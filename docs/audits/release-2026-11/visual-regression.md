# Visual regression classification

## Result

After updating the stale baselines, `pnpm test:visual` passes 28 variants on
Chrome `155.0.8059.79`, `win32-x64`, with the pinned environment recorded in
`tests/visual/baselines/manifest.json`.

Before the update, all 36 images differed. Every capture check passed: desktop
TOC visible, mobile TOC hidden, zero low-contrast text, zero control overlap,
and no horizontal overflow.

## Classification of the 36 differences

All 36 were stale baselines, not UI regressions.

- The baselines were last updated on 2026-10-27 (`315c2593`). After that, the UI
  foundation was replaced (`93297dd9`, "UI基盤を新設しLayoutsを廃止"), button
  styling was unified, theme callout/table spacing changed, mobile/SPA fixes
  landed (`a79ce7ac`), and the scrollbar layout shift was addressed
  (`957714b9`).
- The captured image dimensions prove the scrollbar change: desktop baselines
  were `1440x1200` and current captures are `1425x1200`; mobile baselines were
  `375px` wide and current captures are `360px` wide. The 15px difference is
  the reserved scrollbar width introduced by `957714b9`.
- Differences are global across all 14 themes in both modes and concentrate in
  the navigation, search, TOC, and content regions. Theme-specific paint
  regressions would not change every theme at the same time, and the capture
  checks found no contrast, overlap, or overflow failure.
- Font rendering was ruled out: theme fonts are embedded as woff2 data URLs,
  `document.fonts.ready` is awaited, Chrome is pinned, and the previous run used
  the same browser version.

## Action

The 36 baselines and `manifest.json` were regenerated with
`pnpm test:visual:update` after the classification, and a second
`pnpm test:visual` run reported zero changed images.

## CI limitation

CI integration is not added in this change. The baselines are specific to
Chrome 155 on `win32-x64`; the existing browser job runs on `ubuntu-latest` and
uses the Puppeteer default Chrome, so it would fail the manifest platform and
version checks. A future job would need to run on `windows-latest`, install
Chrome `155.0.8059.79`, and regenerate baselines on that runner image before it
can be enforced. Until then, the visual gate is a documented local pre-release
check.
