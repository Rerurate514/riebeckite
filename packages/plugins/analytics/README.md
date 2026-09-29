# @riebeckite/plugin-analytics

Storage-independent analytics primitives and browser page-view tracking for
Riebeckite. It contains no Cloudflare, Worker, database, or vendor code.

[日本語](./README_ja.md)

## Design

- `AnalyticsEvent` includes a typed `page_view` event and can be extended with
  provider-specific event unions.
- `AnalyticsProvider` declares discoverable capabilities and exposes `capture`
  and `query`. Queries cover per-content page views and popular content, with
  optional ISO-8601 time ranges.
- `UnsupportedAnalyticsQueryError` makes unsupported query capabilities
  explicit. `MemoryAnalyticsProvider` is included for tests and local examples.
- Provider runtime configuration (credentials, storage, bindings) stays inside
  the provider. The browser receives only `AnalyticsPublicConfig`.

## Usage

```ts
import { analytics, MemoryAnalyticsProvider } from "@riebeckite/plugin-analytics";

const provider = new MemoryAnalyticsProvider();

export default {
  plugins: [
    analytics({
      provider,
      publicConfig: { collectorUrl: "/analytics/events" },
    }),
  ],
};
```

`collectorUrl` is intentionally public. It is a relative path or an HTTP(S)
URL for a collector that accepts a JSON `POST` body. A future provider package
can expose a collector backed by its own private runtime configuration.

## Browser behavior

For every published content entry with Core's source-authored stable `id` (or
legacy `uid`), the plugin places a small content-ID marker in rendered HTML and
registers `initAnalytics` with the generic public-config client mechanism.

In a browser, the initializer sends exactly one event per document:

```json
{
  "type": "page_view",
  "contentId": "guide-1",
  "occurredAt": "2026-01-01T00:00:00.000Z",
  "path": "/guide",
  "lang": "en"
}
```

`path` and `lang` are contextual metadata, not identity. Content without a
stable ID is not tracked. The initializer is a no-op during builds/SSR and is
idempotent in a document. Riebeckite's current static document navigation needs
no SPA route hooks; SPA navigation is not tracked automatically.

## Provider contract

```ts
const result = await provider.query({
  type: "popular_content",
  limit: 10,
  timeRange: { from: "2026-01-01T00:00:00.000Z" },
});
```

Capabilities are `capture`, `content_page_views`, and `popular_content`. Call
`assertAnalyticsQuerySupported(provider, query)` when implementing a provider
that may not support all queries.

## Diagnostics

`@riebeckite/plugin-diagnostics` reports an `analytics-untracked` finding for
published content without a stable content ID when the site enables this
plugin, so tracking gaps are visible in `check`, `doctor`, and build
diagnostics.

## Exports

- `analytics()` / `analyticsPlugin()`
- `initAnalytics` (`@riebeckite/plugin-analytics/client`)
- `MemoryAnalyticsProvider`
- Event, query/result, provider/capability, and public-config types
- `UnsupportedAnalyticsQueryError` and capability helpers
