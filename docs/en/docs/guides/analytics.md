# Analytics

Riebeckite analytics is split into two packages with a deliberate boundary: a
storage-independent plugin that registers browser page-view tracking, and an
independent Cloudflare Worker that accepts, validates, and stores those events.

- **`@riebeckite/plugin-analytics`** — the plugin and the provider/query
  contracts. It contains no Cloudflare, Worker, database, or vendor code.
- **`@riebeckite/analytics-cloudflare`** — the Worker runtime for Cloudflare.
  It owns D1/KV storage, request validation, CORS, and the read endpoints.

The site itself stays a normal static build. The analytics Worker is a separate
deployment that never replaces the static site's `wrangler.jsonc` or main entry.

## How tracking works

1. **Stable content IDs.** The browser initializer sends a page view only for
   content that carries a source-authored stable `id` in its frontmatter. See
   [Content System](../framework/content-system.md#stable-content-ids).
2. **Marker.** During the build, the plugin appends a hidden
   `<span data-riebeckite-content-id="...">` marker to every published entry
   that has a content ID.
3. **Browser event.** `initAnalytics` runs once per document, reads the marker,
   and `POST`s one JSON `page_view` event to the configured `collectorUrl`:

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
   stable ID is not measured. Riebeckite's static document navigation reloads
   the document, so one event per page load is the correct model; SPA route
   changes are not tracked automatically.

## Configuring the site

```ts
import { analytics, MemoryAnalyticsProvider } from "@riebeckite/plugin-analytics";

export default defineConfig({
  // ...
  plugins: [
    analytics({
      provider: new MemoryAnalyticsProvider(),
      publicConfig: { collectorUrl: "https://analytics.example.com/events" },
    }),
  ],
});
```

- `provider` is the private runtime implementation of the
  `AnalyticsProvider` contract (`capabilities`, `capture`, `query`). Credentials
  and bindings stay inside the provider.
- `publicConfig.collectorUrl` is deliberately public — the only setting the
  browser receives. It is a site-relative path or an HTTP(S) URL that accepts a
  JSON `POST` body.
- `MemoryAnalyticsProvider` is included for tests and local experiments. Use a
  real collector such as the Cloudflare Worker for production sites.

The plugin validates its options through the normal configuration validation, so
`riebeckite check` and `doctor` report a malformed `provider` or `collectorUrl`.

### Provider contract

`AnalyticsProvider` declares the capabilities it supports — `capture`,
`content_page_views`, and `popular_content`. `capture(event)` stores a page
view; `query(query)` runs one of two read shapes:

```ts
// total views for one content entry, with an optional ISO-8601 time range
await provider.query({
  type: "content_page_views",
  contentId: "guide-1",
  timeRange: { from: "2026-01-01T00:00:00.000Z" },
});

// ranked content with an optional limit and time range
await provider.query({ type: "popular_content", limit: 10 });
```

A provider that cannot satisfy a query throws
`UnsupportedAnalyticsQueryError`; call `assertAnalyticsQuerySupported(provider,
query)` when implementing one. Capability and query helpers are exported from
the plugin package root.

## Collecting events with a Cloudflare Worker

`@riebeckite/analytics-cloudflare` exposes `createWorker(options)` and two
storage adapters. Select exactly one adapter; there is no default.

| Adapter | Capabilities | Notes |
| --- | --- | --- |
| `D1AnalyticsStorage` / `d1Storage(db)` | capture, content totals, popular ranking, bucket time ranges | Atomic SQLite upserts into UTC daily aggregates. Stores no individual event rows. |
| `KvAnalyticsStorage` / `kvStorage(namespace)` | capture only | Best-effort totals; concurrent writes can be lost and online reads would be misleading, so `content_page_views` / `popular_content` return `501`. |

```ts
import { createWorker, d1Storage } from "@riebeckite/analytics-cloudflare";

export interface Env { ANALYTICS_DB: D1Database; }

export default {
  fetch(request: Request, env: Env) {
    return createWorker({
      storage: d1Storage(env.ANALYTICS_DB),
      cors: { allowedOrigins: ["https://www.example.com"] },
    }).fetch(request);
  },
};
```

The binding is constructed per request because `env` exists only in `fetch`.

### Rate limiting is a mitigation, not authentication

Origin is not authentication, so a client can forge an allowed `Origin` and POST
fabricated page views directly. Pass the optional `rateLimit` boundary to apply
a fixed-window limit per connecting IP and return HTTP `429` once exceeded:

- `D1AnalyticsRateLimiter` / `d1RateLimiter(db, { maxRequests, windowMs })` —
  an atomic D1 counter shared across isolates. Apply
  `migrations/0002_analytics_rate_limits.sql` before deploying.
- `MemoryAnalyticsRateLimiter` — process-local counters for tests and local
  development. Worker isolates are short-lived and not shared, so it does not
  limit a distributed client. Use D1 for production.

Rate limiting only reduces abuse from a single client; it never fully prevents
fabricated or distributed page views. Treat collected analytics as untrusted.

### Endpoints

- `POST /events` — accepts a JSON `page_view` payload (up to 8 KiB) and returns
  `204`. Invalid JSON, unknown fields, unsafe strings, or a non-JSON content
  type are rejected with `400`/`415`; oversized bodies are rejected with `413`;
  a client over its rate-limit window is rejected with `429`.
- `GET /content/:contentId/page-views?from=&to=` — content totals.
- `GET /popular?limit=&from=&to=` — popular ranking.

Read endpoints are available only when the storage adapter advertises the
corresponding capability. Origin access is deny-by-default: set explicit
`allowedOrigins`, or use `"any"` only for a consciously public collector. No
cookie, user-agent, or fingerprinting data is read or stored; `path` and `lang`
are contextual and D1 does not persist them. When a rate limiter is configured,
the connecting IP (`CF-Connecting-IP`) is read as its key; the D1 limiter stores
that key only for the active window.

### Deploying

Apply the D1 schema explicitly before deploying — never migrate from a request:

```sh
pnpm exec wrangler d1 execute ANALYTICS_DB --file node_modules/@riebeckite/analytics-cloudflare/migrations/0001_analytics_page_views.sql
pnpm exec wrangler d1 execute ANALYTICS_DB --file node_modules/@riebeckite/analytics-cloudflare/migrations/0002_analytics_rate_limits.sql
pnpm exec wrangler deploy
```

Copy either `templates/analytics-cloudflare/d1` or `templates/analytics-cloudflare/kv`
into a separate Worker directory/repository. Each template has its own `main`
and must not replace the static Riebeckite site's `wrangler.jsonc` or main
entry. Point the site's `collectorUrl` at the deployed Worker's `/events`.

## Diagnostics

`@riebeckite/plugin-diagnostics` reports an `analytics-untracked` finding (info
severity) for each published note without a stable content ID when the config
enables the analytics plugin. This makes tracking gaps visible directly in
`check`, `doctor`, and build diagnostics; it never modifies content. See
[Diagnostics](../framework/diagnostics.md) for the check/doctor/inspect contract.

## Reading list

- [Content System](../framework/content-system.md#stable-content-ids) — stable content IDs
- [Diagnostics](../framework/diagnostics.md) — structured findings, `check`, and `doctor`
- [Framework Reference](../reference/README.md) — public package surface
- [HonoX Integration](../framework/honox-integration.md) — the static site build this
  Worker runs beside
- [Usage Guide](./README.md) — deployment of the static site