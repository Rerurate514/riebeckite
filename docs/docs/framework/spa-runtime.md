---
date: 2026-10-23
title: SPA Runtime Internals
---
# SPA Runtime Internals

This page describes the browser runtime behind SPA navigation for maintainers:
link matching, the navigation flow and cancellation, page metadata updates,
history and scroll restoration, prefetching, page initializer wiring, build
impact, and the current verification coverage.

Read the [SPA navigation architecture](./spa-navigation.md) first for the
package-level picture and design rationale.

## In this section

- [Flow](./spa-runtime/flow.md)
- [Metadata](./spa-runtime/metadata.md)
- [Initializers](./spa-runtime/initializers.md)

## Progress bar

The runtime lazily creates one `[data-spa-progress]` element in the body and
one injected stylesheet. A navigation starts a 150 ms timer so fast cache hits do
not flash the bar. The bar stays hidden until that timer fires, then clears when
the navigation commits, fails over to a document load, is superseded, or the
runtime stops. The stylesheet uses `--rb-color-accent` when present and falls
back to a built-in accent color. Reduced-motion preferences replace the moving
segment with a static bar.

## Current constraints

- Link handling is limited to same-origin anchors and `popstate`; forms and
  programmatic navigation are not intercepted.
- The runtime requires a stable `main#main-content`; missing roots fall back to a
  full document load.
- Page ownership is explicit for generated plugin metadata and data scripts;
  other custom head nodes must set an ownership attribute. Executable scripts
  always persist and are not re-run.
- Resource scope only releases resources registered through it; returned cleanup
  remains necessary for resources it cannot own.
- Prefetch is short-lived and is not an offline cache.
- HonoX `createClient()` hydrates new islands but is not a general island
  teardown API.
- SPA navigation is not an offline cache or a client-side router.

## Related

- [Enable SPA navigation](../guides/spa-navigation.md)
- [SPA navigation architecture](./spa-navigation.md)
- [HonoX integration](./honox-integration.md)
- [Plugin system](./plugin-system.md)
