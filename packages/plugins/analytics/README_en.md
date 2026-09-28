# @riebeckite/plugin-analytics

Provider analytics injection for Riebeckite sites: a static bootstrap endpoint
plus a browser entry that loads it.

[日本語](./README_ja.md)

## Overview

`analytics()` registers:

- one GET endpoint (default `/_analytics.js`) that serves a small provider
  bootstrap written in JavaScript, and
- one client entry, `initAnalytics`, that appends
  `<script defer src="/_analytics.js">` to `document.head` exactly once.

The plugin is build-time only. It never executes provider code during the static
build.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { analytics } from "@riebeckite/plugin-analytics";

export default defineConfig({
  // ...
  plugins: [
    analytics({ provider: "plausible", domain: "example.com" }),
  ],
});
```

Provider examples:

```ts
analytics({ provider: "plausible", domain: "example.com" });
analytics({ provider: "umami", siteId: "xxxxxxxx-xxxx-xxxx" });
analytics({ provider: "umami", siteId: "…", domain: "example.com" });
analytics({ provider: "google-analytics", measurementId: "G-XXXXXXXXXX" });
analytics({ provider: "custom", scriptUrl: "https://cdn.example.com/a.js" });
analytics({ provider: "custom", snippet: "window.__analytics = true;" });
```

## Options

| Option | Type | Required | Description |
| ------ | ---- | -------- | ----------- |
| `provider` | `"plausible" \| "umami" \| "google-analytics" \| "custom"` | yes | Provider whose bootstrap is served |
| `domain` | `string` | Plausible; optional for Umami | Plausible `data-domain`, or Umami `data-domains` |
| `siteId` | `string` | Umami | Umami `data-website-id` |
| `measurementId` | `string` | google-analytics | GA measurement id (`G-…`) |
| `scriptUrl` | `string` | Provider default | Overrides the provider script URL; the custom script URL when no `snippet` is given |
| `snippet` | `string` | custom (with no `scriptUrl`) | Raw bootstrap JavaScript, served verbatim |
| `scriptPath` | `string` | `/_analytics.js` | Endpoint and client script path |

`validateOptions` reports missing or mistyped fields through the standard
Riebeckite config validation, so `riebeckite check` fails fast on a bad setup.

Provider script URL defaults:

| Provider | Default URL |
| -------- | ----------- |
| `plausible` | `https://plausible.io/js/script.js` |
| `umami` | `https://cloud.umami.is/script.js` |
| `google-analytics` | `https://www.googletagmanager.com/gtag/js` |

## Endpoint contract

- `GET /_analytics.js`
- `200 OK`
- `Content-Type: application/javascript; charset=utf-8`
- `Cache-Control: public, max-age=3600`
- Body: a self-executing snippet that creates the provider `<script>` tag
  (`async`/`defer` as appropriate). All configured values are JSON-encoded, so
  they cannot break out of their string literals.

`google-analytics` also defines `window.dataLayer` and `window.gtag` before
configuring the measurement id. `custom` returns the `snippet` verbatim, or a
generic loader for `scriptUrl`.

## Client behavior (`initAnalytics`)

- Runs on page load through `initRiebeckiteClient()`; no component or layout
  change is required.
- Appends one `<script defer src="/_analytics.js" data-riebeckite-analytics>`
  to `document.head`, and is a no-op if that tag already exists.

## Privacy and trust boundary

- No analytics data is collected at build time; the endpoint only serves code.
- The `custom` provider's `snippet` (or any `scriptUrl`) is injected as-is into
  visitors' pages. Treat it as trusted configuration, never as user input.
- Nothing is sanitized or proxied: whatever provider you configure receives the
  requests directly from the browser, under the site's own origin and privacy
  policy.

## Verifiability

Static builds do not execute client JavaScript. To keep analytics visible in
built HTML, `onManifestCreated` appends a stable marker to every entry:

```html
<!-- RIEBECKITE_EXTERNAL_ANALYTICS_MARKER -->
<link rel="preload" as="script" href="/_analytics.js" />
<script defer src="/_analytics.js"></script>
```

The marker is idempotent and does not alter the surrounding document structure.

## Limitations

- **Static client path.** The client entry receives no options, so it always
  loads `/_analytics.js`. If you override `scriptPath`, mount the endpoint and
  load it yourself with a custom client entry.
- **No SPA route tracking.** Client-side routed SPA navigations are not
  reported automatically; configure the provider or send events manually.
- **Document lifecycle only.** The bootstrap runs once on initial load. Provide
  your own `snippet` if you need a more involved lifecycle.
- **No consent management.** The plugin does not gate loading on user consent;
  add that in a client entry if your jurisdiction requires it.

## Exports

- `analytics(options)` / `analyticsPlugin(options)` — plugin factory
- `initAnalytics` — browser initializer (also via
  `@riebeckite/plugin-analytics/client`)
- `buildAnalyticsScript(options)` — pure bootstrap builder
- `validateAnalyticsOptions(options)` — options validator
- Constants: `ANALYTICS_SCRIPT_PATH`, `ANALYTICS_MARKER`
- Types: `AnalyticsOptions`, `AnalyticsProvider`

## See also

- [Plugin guide](../../docs/plugins_en.md)
