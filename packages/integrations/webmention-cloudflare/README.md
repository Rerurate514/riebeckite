# @riebeckite/webmention-cloudflare

Cloudflare Worker, D1, and KV runtime for
[`@riebeckite/plugin-webmention`](../../plugins/webmention/README.md). The generic
plugin defines the storage seam; this package owns bindings and storage.

[日本語](./README_ja.md)

## Architecture

`d1Storage` / `kvStorage` implement the generic `WebmentionProvider` contract so
the same site can mount the plugin's `endpoints` inside its own Worker and pass
a binding-backed provider. `createWorker` is an optional standalone receiver
for a separate Worker deployment: it validates input, verifies that the source
links to the target, stores the mention, and serves the verified-mention feed.
D1 and KV live in infrastructure and are never imported by
`@riebeckite/plugin-webmention`.

## Storage adapters

- **`D1WebmentionStorage`**: one row per verified `(source, target)` pair with
  upsert on conflict. Supports `store` and `query` (per-target and all-mention
  reads, with `?since=`). Targets are stored in canonical comparison form.
- **`KvWebmentionStorage`**: store-only. KV has no listing or atomic update, so
  reads deliberately throw `UnsupportedWebmentionQueryError` (the Worker
  returns `501`). KV keys are capped at 512 bytes; use D1 for long URLs.

There is no default adapter. Bind and construct exactly one per Worker.

## Using the plugin on the site Worker

```ts
import { webmention } from "@riebeckite/plugin-webmention";
import { d1Storage } from "@riebeckite/webmention-cloudflare";

export interface Env {
  WEBMENTION_DB: D1Database;
}

export const config = defineConfig({
  plugins: [webmention({ provider: d1Storage(env.WEBMENTION_DB) })],
});
```

`mountRiebeckiteEndpoints` then mounts `POST /webmentions` and
`GET /webmentions`, and verified mentions render near articles at build time.

## Standalone receiver

```ts
import { createWorker, d1Storage } from "@riebeckite/webmention-cloudflare";

interface Env {
  WEBMENTION_DB: D1Database;
}

export default {
  fetch: (request: Request, env: Env) =>
    createWorker({
      storage: d1Storage(env.WEBMENTION_DB),
      allowedTargets: ["https://www.example.com/"],
    }).fetch(request),
};
```

The standalone receiver knows only the targets in `allowedTargets`; it has no
content manifest, so feed entries carry no article summary. When the receiver
shares the site Worker, prefer the plugin's `endpoints` so mentions are matched
to published entries.

## Endpoints and validation

- `POST /webmentions` accepts `source` and `target` as form-encoded or JSON
  (8–64 KiB body cap), requires the target to be an allowed absolute URL, and
  verifies the source links to it before storing. Responses: `202` accepted,
  `400` with an `error` code, `503` when storage cannot write.
- `GET /webmentions?target=&limit=&since=` returns
  `{ version, generatedAt, count, mentions }`. Requires storage with the
  `query` capability, otherwise `501`.

The default source fetcher blocks loopback and private-network hosts, caps the
response size, and times out. Webmention senders are servers, so
`allowMissingOrigin` defaults to `true`; browser origins remain denied unless
explicitly listed.

## D1 schema and deployment

Workers must not migrate D1 during a request. Apply the schema before
deploying:

```sh
pnpm exec wrangler d1 execute WEBMENTION_DB --file node_modules/@riebeckite/webmention-cloudflare/migrations/0001_webmentions.sql
pnpm exec wrangler deploy
```

## See also

- [@riebeckite/plugin-webmention](../../plugins/webmention/README.md)
- [Analytics Cloudflare runtime](../analytics-cloudflare/README.md)
