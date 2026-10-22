# @riebeckite/spa

Opt-in browser navigation runtime for Riebeckite sites.

[日本語](./README_ja.md)

## Installation

`@riebeckite/honox` loads this package when the site enables `spa` in its
Riebeckite configuration. Applications using the HonoX integration do not need
to import it directly.

```sh
pnpm add @riebeckite/spa
```

## Usage

Enable navigation in `riebeckite.config.ts`:

```ts
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  spa: true,
});
```

Set `spa: false` or omit `spa` to disable navigation. Pass an options object
instead of `true` to customize the runtime:

```ts
export default defineConfig({
  spa: { prefetch: "hover", viewTransitions: true },
});
```

The server renderer must provide one `<main id="main-content" tabindex="-1">`
per page. The runtime replaces this root after a successful same-origin GET
navigation. It keeps the application shell in place, reconciles page-owned head
metadata, restores history and scroll state, moves focus to the page root, and
announces the new page to assistive technology.

Links with a modifier key, another target, `download`, or `data-spa="false"`
keep normal browser behavior. Failed transitions fall back to document
navigation.

## Public API

- `spa(options)` — creates a Riebeckite SPA configuration value.
- `startSpaNavigation(options)` — starts navigation and returns a cleanup
  function for custom browser integrations.

See the [SPA navigation guide](../../docs/docs/guides/spa-navigation.md) to
enable it, and [SPA runtime internals](../../docs/docs/framework/spa-runtime.md)
for the implementation constraints.
