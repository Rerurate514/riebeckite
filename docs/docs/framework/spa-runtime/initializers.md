---
date: 2026-10-23
title: Initializers
sidebar.label: Initializers
sidebar.order: 30
---
# Initializers

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

- `scope: "app"` mounts on `document` once. An app-scoped entry with a
  `presenceSelector` is re-checked on each page commit, so a marker introduced
  by SPA navigation can still load it.
- `scope: "page"` (the default) mounts on `main#main-content` and is unmounted
  before each replacement. Set `root: "document"` when its marker is in a shell
  region outside the page root.
- `presenceSelector` is evaluated against the whole current document. It only
  gates loading; the initializer still finds its own elements.
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

For `initializerArguments: "context"`, a client entry receives `{ root, marker,
config, signal, scope }`. `marker` is the element matched by
`presenceSelector`. The default page root is still the current page container;
use `root: "document"` when the marker belongs to the shell. In development the
generated module warns once when a page-scoped marker is outside its page root.
Resource scope tracks listeners, timeouts, intervals, and custom cleanup. It is
deliberately opt-in: it does not monkey-patch globals or infer resources created
outside the initializer.

## Build and SSG impact

The SPA runtime changes the client bundle, not the server renderer or [[glossary/ssg|SSG]]
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
