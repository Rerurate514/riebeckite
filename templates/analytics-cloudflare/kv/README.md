# Riebeckite analytics Worker — KV

This independent Worker records only best-effort page-view totals. Copy it to a
separate directory/repository; never replace the static site's `wrangler.jsonc`
or Worker main.

Create a KV namespace, replace the namespace ID, Worker name, and allowed
origin, then deploy with `pnpm exec wrangler deploy`. Configure the generic
plugin's `publicConfig.collectorUrl` with the resulting `/events` URL.

KV does not have atomic increment or aggregate queries. Concurrent counts may
be lost; `GET /content/.../page-views` and `GET /popular` return HTTP 501 by
design. Use the D1 template for reports or accurate increments.
