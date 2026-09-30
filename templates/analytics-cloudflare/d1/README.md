# Riebeckite analytics Worker — D1

This is a **separate Worker** for analytics. Do not copy its `main` or
`wrangler.jsonc` into the static Riebeckite site's Worker.

1. Put this template in its own directory/repository and install
   `@riebeckite/analytics-cloudflare`.
2. Create a D1 database, replace `database_id`, Worker `name`, and the allowed
   site origin in `src/worker.ts`.
3. Apply the aggregate and rate-limit schemas explicitly (never from a request):

   ```sh
   pnpm exec wrangler d1 execute my-riebeckite-analytics --file node_modules/@riebeckite/analytics-cloudflare/migrations/0001_analytics_page_views.sql
   pnpm exec wrangler d1 execute my-riebeckite-analytics --file node_modules/@riebeckite/analytics-cloudflare/migrations/0002_analytics_rate_limits.sql
   ```

4. Deploy with `pnpm exec wrangler deploy`, then set the site's generic plugin
   `publicConfig.collectorUrl` to `https://<worker>.workers.dev/events`.

The template wires `D1AnalyticsRateLimiter` (60 requests per IP per minute) as a
best-effort mitigation; adapt the limit or remove it as needed. It is not
authentication and does not fully prevent forged or distributed page views.

D1 provides atomic increments, content totals, popular ranking, and UTC-day
bucket range queries. It stores no individual event rows.
