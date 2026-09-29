# @riebeckite/analytics-cloudflare

Independent Cloudflare Worker runtime for `@riebeckite/plugin-analytics`. The
generic plugin contains only browser configuration and analytics contracts; this
package owns Worker bindings and storage.

## Architecture

`createWorker` is the presentation boundary for a dedicated Worker runtime. It
validates HTTP input, calls the generic `AnalyticsProvider` contract through the
runtime-owned `AnalyticsStorage` boundary, and maps unsupported reads to HTTP
errors. D1 and KV live in infrastructure and are never imported by
`@riebeckite/plugin-analytics`. The site's only public setting remains the
generic plugin's `collectorUrl`; bindings and storage selection stay in this
Worker.

## Choose exactly one storage adapter

- **`D1AnalyticsStorage`**: atomic SQLite upserts into UTC daily aggregate
  buckets. It supports capture, content page-view totals, popular-content
  ranking, and date-bucket time ranges. It stores no raw event log. A range is
  bucket-based: bounds select entire UTC days, not exact sub-day event windows.
- **`KvAnalyticsStorage`**: minimal best-effort total capture only. KV lacks
  atomic increment and aggregate listing, so concurrent writes can be lost and
  `content_page_views` / `popular_content` deliberately throw
  `UnsupportedAnalyticsQueryError` (the Worker returns `501`). Do not use it
  for reporting.

There is no default adapter. Bind and construct exactly one in the Worker.

```ts
import { createWorker, D1AnalyticsStorage } from "@riebeckite/analytics-cloudflare";

export interface Env { ANALYTICS_DB: D1Database; }
export default { fetch: (request: Request, env: Env) =>
  createWorker({ storage: new D1AnalyticsStorage(env.ANALYTICS_DB), cors: { allowedOrigins: ["https://www.example.com"] } }).fetch(request),
};
```

The Worker binding is constructed per request because `env` exists only in
`fetch`.

## Endpoints and validation

- `POST /events` accepts only JSON `page_view` payloads with an ISO timestamp,
  a 1–160 character safe content ID (`[A-Za-z0-9._:-]` after the first
  alphanumeric character), optional bounded path and language, and no unknown
  fields. Bodies are limited to 8 KiB.
- `GET /content/:contentId/page-views?from=&to=` and `GET /popular?limit=&from=&to=`
  are available only when storage advertises the corresponding capability.

Origin access is deny-by-default. Set explicit `allowedOrigins`; use `"any"`
only for a consciously public collector. No request IP, cookies, user-agent,
or fingerprinting data is read or stored. The accepted `path` and `lang` are
contextual metadata and D1 does not persist them.

## D1 schema and deployment

Workers must not migrate D1 during a request. Apply the included schema before
deploying:

```sh
pnpm exec wrangler d1 execute ANALYTICS_DB --file node_modules/@riebeckite/analytics-cloudflare/migrations/0001_analytics_page_views.sql
pnpm exec wrangler deploy
```

Copy either `templates/analytics-cloudflare/d1` or `kv` into a separate Worker
repository/directory. It has its own `main` and must not replace a static
Riebeckite site's `wrangler.jsonc` or main entry.
