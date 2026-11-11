---
date: 2026-10-06
title: UX
---
# UX

Client-side progressive enhancements for reading. The plugin leaves the built
article HTML untouched and adds a reading progress bar and a back-to-top button
at runtime.

[日本語](./ux.ja.md)

## Live example

A reading-progress bar runs along the top of this page, and a back-to-top button appears once you scroll.

## Features

- **Reading progress bar** — a thin fixed bar (`.rb-ux__progress`) that follows
  the scroll position through the article.
- **Back-to-top button** — a real `button` (`.rb-ux__back-to-top`) with an
  `aria-label` that appears after scrolling and smooth-scrolls to the top.
Every feature is a no-op when the relevant DOM is absent, and `initUx()` is
idempotent.

## Installation

```sh
npm install @riebeckite/plugin-ux
```

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { ux } from "@riebeckite/plugin-ux";

export default defineConfig({
  // ...
  plugins: [
    ux({
      progress: true,
      backToTop: true,
      backToTopLabel: "Back to top",
    }),
  ],
});
```

The factory is also exported as `ux`.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `progress` | `boolean` | `true` | Show the reading progress bar |
| `backToTop` | `boolean` | `true` | Show the back-to-top button |
| `backToTopLabel` | `string` | `"Back to top"` | `aria-label` for the back-to-top button |

## How configuration reaches the client

Client initializers are bundled statically and cannot receive plugin options.
At build time the plugin prepends an inert JSON configuration element to each article HTML. It is implementation data and is not displayed in article content.

`initUx()` reads that element to restore the options; when it is missing, every
feature falls back to its enabled default. Injection happens in
`onPostProcessed` (the object `getProcessedContent()` caches and renders) and is
mirrored onto remaining manifest entries in `onManifestCreated`. The
`data-rb-ux-config` attribute doubles as the marker that keeps the element from
being inserted twice per page.

## Emitted HTML / CSS hooks

| Class | Target |
| --- | --- |
| `rb-ux__progress` | Progress bar track (`role="progressbar"`) |
| `rb-ux__progress-bar` | Bar scaled with `scaleX` |
| `rb-ux__back-to-top` | Back-to-top button |
| `rb-ux__back-to-top--visible` | Added while the button is visible |

Styles ship as `@riebeckite/plugin-ux/style.css` and use the theme's
`--rb-color-*` tokens so they do not fight the existing theme.

## Accessibility

- The back-to-top control is a `button` with an `aria-label`.
- The progress bar exposes `role="progressbar"` with `aria-valuemin`,
  `aria-valuemax`, and `aria-valuenow`.
- Under `prefers-reduced-motion: reduce`, progress and back-to-top transitions
  are disabled and the back-to-top jump becomes an immediate scroll.
- The progress bar and buttons are hidden when printing.

## Limitations

- Client-only: without JavaScript nothing is added.
- With SPA navigation enabled, the enhancements are re-initialized after the
  page root is replaced.

## Exports

- `ux(options?)` / `ux(options?)` — plugin factory
- `initUx` — browser initializer
- Types: `UxOptions`, `UxResolvedConfig`

## See also

- [Plugin guide](../reference/plugin-api.md)
