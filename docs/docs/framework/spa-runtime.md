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

## The page transition flow

During SPA navigation, the runtime fetches the next HTML document and replaces
only `<main id="main-content">`. The application shell outside that element,
including the header, footer, and global styles, stays in place.

```mermaid
sequenceDiagram
    participant U as User
    participant R as SPA runtime
    participant S as Server
    participant L as ClientLifecycle
    participant H as HonoX client

    U->>R: click an eligible link
    R->>R: abort the previous navigation
    R->>S: GET target URL (Accept: text/html)
    S-->>R: HTML
    R->>L: unmount page scope
    R->>R: reconcile head, replace main
    R->>H: createClient()
    R->>L: mount page scope
    R->>R: update history, scroll, focus, announcement
    R-->>U: riebeckite:navigation
```

The order matters. Page-specific cleanup runs before the main element is
replaced, and page initialization runs after HonoX hydrates the new islands.

Starting a new navigation aborts the one in progress. An aborted navigation
cannot update page metadata, the DOM, history, the page lifecycle, focus, the
announcement, or the navigation event.

## Which links use SPA navigation

`startSpaNavigation` listens for clicks on the document and handles a click only
when all of these are true:

- `defaultPrevented` is false
- the primary button was pressed
- no Meta, Ctrl, Shift, or Alt key is pressed
- the closest `a[href]` passes `shouldNavigate`
- the destination is not a hash-only change on the current page

`shouldNavigate` requires:

- `target` is absent or `_self`
- no `download` attribute
- no `data-spa="false"`
- the same origin and protocol

A hash-only change means the same pathname and search with a non-empty hash.
Those clicks are left to the browser so in-page anchors keep native behavior.

Back and forward navigation (`popstate`) does not use link matching. It starts a
navigation for the current URL with `popstate: true`.

## Navigation and cancellation

Each navigation creates an `AbortController`. Starting a new navigation aborts
the previous one.

`navigate` does the following:

1. For click navigations, saves the current scroll position into `history.state`
   when scroll restoration is enabled.
2. Fetches the target with `Accept: text/html, application/xhtml+xml`.
3. Parses the response with `DOMParser`.
4. Requires `main#main-content` in both the fetched and current document.
5. Computes the final URL from the response URL, resolving redirects.
6. Runs `onBeforePageCommit(signal)`.
7. Reconciles the head and replaces the current main with the fetched main.
8. Runs `onPageCommit({ root, signal })`.
9. Waits for the view transition's DOM update to complete, if one is used.
10. Pushes history for click navigations and restores scroll.
11. Focuses the page root and announces the new page.
12. Dispatches `riebeckite:navigation`.

The runtime checks both its navigation generation and the signal at each async
boundary. Only the newest navigation can update the head, DOM, history, page
lifecycle, focus, announcement, or navigation event.

A same-page `popstate` navigation does not fetch HTML. It restores the saved
scroll position and focuses the hash target when present, or the page root
otherwise.

Fetches time out after 15 seconds, and responses with a non-HTML content type
are treated as failures. A redirect to another origin also fails.

If a non-aborted error occurs, the runtime calls `window.location.assign()` for
the final destination and falls back to a normal document navigation. The same
happens when a commit hook fails after the page content has been replaced.
Either path leaves the browser on a fully rendered document. This is the
document-navigation fallback.

## Updating page metadata

Before replacing the main element, the runtime updates the parts of `<head>`
that can change from page to page:

- sets `document.title` from the fetched page
- copies `<html lang>` and `<html dir>`, or removes them when absent
- removes current head children matching the page-owned set
- clones matching children from the fetched page into the current head

The boundary between page-owned and persistent elements is explicit:

- `data-riebeckite-head="page"` nodes are replaced.
- `data-riebeckite-head="global"` and `"runtime"` nodes persist.
- Plugin `meta` and `link` head tags are marked page-owned automatically.
- Plugin data scripts (`application/ld+json`, `application/json`) are also
  page-owned.
- Executable plugin scripts are left unowned so they are neither cloned nor
  re-executed.

The following legacy selector set is also page-owned for compatibility:

- `link[rel="canonical"]`, `link[hreflang]`
- `script[type="application/ld+json"]`
- `meta[name="description"]`, `meta[name="author"]`,
  `meta[name="robots"]`
- `meta[name^="twitter:"]`
- `meta[property^="og:"]`, `meta[property^="article:"]`

Everything else in the head persists. An executable `<script>` is never
replaced, even when it has `data-riebeckite-head="page"`, because running it
again would repeat its side effects. A `<script>` or `<style>` without an
ownership attribute also persists.

## History, scroll, focus, and announcements

When scroll restoration is enabled, the runtime sets
`history.scrollRestoration = "manual"` and restores the previous value on stop.

It saves the scroll position into `history.state` with `replaceState` when
scrolling settles and immediately before a click navigation. Back and forward
navigation restores the saved position. When no position was saved, it does not
restore one.

A click navigation pushes an entry with `{ scroll: [0, 0] }` after a successful
commit and scrolls to the top. A URL with a hash scrolls to the matching element
instead.

History:

- Click navigations push a new entry after a successful commit.
- `popstate` navigations do not push.
- Redirects use the response URL.

Focus and announcement:

- Unless the URL has a hash, the runtime adds `tabindex="-1"` if needed and
  focuses the new main element with `preventScroll`.
- It creates or reuses `#riebeckite-navigation-announcer`, an
  `aria-live="polite"` element, and sets its text to the new document title.
- The `riebeckite:navigation` event carries `{ url, popstate }`.

## Prefetch

`prefetch: "hover"` adds a `pointerover` listener. It uses the same link
eligibility rules as click navigation and ignores hash-only links.

The cache:

- holds at most 20 completed least-recently-used entries, keyed by URL
- deduplicates active requests from prefetch and navigation
- keeps successful responses for 30 seconds
- removes failed and expired entries
- aborts pending work when the runtime stops

Prefetch is skipped for data-saving, `slow-2g`, and `2g` connections. A caller's
abort signal rejects only that caller; it does not cancel a shared request.

## Connecting page initializers

After replacing a page, the new islands must be hydrated and page-scoped
initializers must run. The HonoX integration provides this connection as a
generated client module.

### Generated client module

The HonoX integration serves `virtual:riebeckite/client`. When `spa` is enabled,
the generated module starts the runtime once:

```ts
stopSpaNavigation ??= startSpaNavigation({
  ...spaConfig,
  onBeforePageCommit: () => lifecycle.unmount("page"),
  onPageCommit: async ({ root, signal }) => {
    if (signal.aborted) return;
    await createClient();
    if (signal.aborted || !root.isConnected) return;
    mountPageClientInitializers(root);
  },
});
```

`spaConfig` is the serialized options object. The module imports `createClient`
from `honox/client` and `startSpaNavigation` from `@riebeckite/spa` only when the
resolved `spa` value is present.

The generated module exports:

- `initRiebeckiteClient()` — mounts app and page initializers and starts SPA
  navigation.
- `remountRiebeckitePage(root)` — unmounts page scope and mounts it on a given
  root.
- `disposeRiebeckiteClient()` — stops SPA navigation and disposes both scopes.

Site code normally calls only `initRiebeckiteClient()`. The other exports
support custom integrations and disposal.

### Initializer lifecycle

The generated module mounts plugin client entries according to their metadata:

- `scope: "app"` mounts on `document` once.
- `scope: "page"` (the default) mounts on `main#main-content` and is unmounted
  before each replacement.
- `initializerArguments` selects the argument: `config` (the default), `root`,
  or `context`.

`ClientLifecycle.mount` is fire-and-forget in generated code:
`void lifecycle.mount(...)`. An async initializer can still be running when the
next navigation starts. It receives a signal and should stop when aborted.

When the same initializer name is mounted twice in the same scope:

- same root: the existing mount is reused
- different root: the lifecycle throws

`ClientLifecycle.unmount` aborts first, then awaits cleanup. Cleanup errors are
reported and do not block other initializers.

The generated `onPageCommit` awaits `createClient()`, then re-checks both the
navigation signal and whether the page root is still connected before mounting
page initializers. This prevents slow hydration from mounting initializers for a
page that is no longer current.

For `initializerArguments: "context"`, a client entry receives `{ root, config,
signal, scope }`. Resource scope tracks listeners, timeouts, intervals, and
custom cleanup. It is deliberately opt-in: it does not monkey-patch globals or
infer resources created outside the initializer.

## Build and SSG impact

The SPA runtime changes the client bundle, not the server renderer or SSG
output.

- With `spa` omitted or `false`, the virtual module has no import of
  `@riebeckite/spa` or `honox/client`; the runtime is not in the bundle.
- With `spa` enabled, Vite includes the runtime and the generated client module
  gains the `createClient` import and SPA startup.
- The server build and static output plan are unchanged; both modes render the
  same HTML.

Measured impact on the external fixture (2026-10-21): SPA added 5,570 B raw,
1,715 B gzip, and 1,472 B brotli to the unique JavaScript assets. On that local
no-store fixture, the initial load median was effectively unchanged, and hover
prefetch reduced the SPA navigation median relative to SPA without prefetch.
These numbers are fixture-specific.

## Verification coverage

Automated checks currently cover:

- option validation in `packages/spa/test/spa.test.ts`, plus cache TTL,
  deduplication, LRU eviction, and caller abort isolation in
  `packages/spa/test/prefetch.test.ts`
- generated client imports, app/page/context arguments, and SPA on/off wiring in
  `packages/integrations/honox/test/client_module.test.ts`
- browser navigation races, head ownership, history, hash focus, fallbacks,
  redirects, and prefetched-page reuse in
  `tests/spa-runtime/browser.test.ts`

Not covered by automated browser tests in this repository:

- click eligibility edge cases
- scroll restoration on `popstate`
- cleanup failures in real plugin initializers

Treat changes to these areas as requiring targeted tests or manual verification.
The absence of a test is not evidence that the behavior is complete.

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
