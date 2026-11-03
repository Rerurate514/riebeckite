# @riebeckite/plugin-webmention

<!-- Generated from docs/docs/plugins/webmention.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Receive Webmentions, verify that the source document really links to the
target, store them through a pluggable provider, and render verified mentions
near articles. The core plugin contains **no Cloudflare, Worker, database, or
vendor code**; it uses `@riebeckite/core`, `@riebeckite/ui`, and `hono`, plus
`undici` for pinned DNS connections on Node.

[日本語](./README_ja.md)

## What it does

- Accepts Webmentions at `POST /webmentions`.
- Fetches the source page and checks for a link to the target before storing.
- Stores mentions through a provider; the default is in-memory.
- Returns a JSON feed at `GET /webmentions`.
- Renders verified mentions with `WebmentionSection`.

Use it when readers can link to your articles from their own sites and you want
those mentions collected on your site. The sender must support Webmention; this
plugin does not discover mentions on its own.

## Quick start

1. Install the plugin:

```sh
npm install @riebeckite/plugin-webmention
```

2. Enable it:

```ts
import { defineConfig } from "@riebeckite/core";
import { webmention } from "@riebeckite/plugin-webmention";

export default defineConfig({
  plugins: [webmention()],
});
```

Without a provider, mentions are stored in memory. This is enough to try the
endpoint locally, but mentions are lost when the process restarts.

3. Mount the endpoint. The scaffold's `app/server.ts` already calls
   `mountRiebeckiteEndpoints`. If you use a custom server, mount the plugin's
   endpoints there; see [Add an HTTP Endpoint](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/plugins/recipes/endpoints.md).

4. Start the dev server and check the feed:

```sh
npm exec riebeckite dev
curl http://localhost:5173/webmentions
```

The port is printed by `dev`. An empty feed returns the feed envelope with
`count: 0`.

5. Send a Webmention from a page that links to your article. A manual `curl`
   request is useful for checking error responses, but it is rejected unless
   the source page really links to the target:

```sh
curl -i -X POST http://localhost:5173/webmentions \
  -H "Content-Type: application/json" \
  -d '{"source":"https://example.com/post","target":"https://example.com/your-article"}'
```

6. Display mentions near an article. See [Rendering](#rendering) below.

## How it works

- `WebmentionProvider` is the storage/runtime seam: it advertises
  `store` / `query` capabilities and exposes `store(mention)` and
  `query(query)`. Credentials, database handles, and runtime bindings stay
  inside the adapter and never reach plugin options or generated output.
- `MemoryWebmentionProvider` is included for tests, local previews, and as a
  provider contract example. It does not persist across processes/isolates and
  keeps at most 1,000 mentions, evicting the oldest first.
- The plugin declares `endpoints`: `POST {endpoint}` receives a Webmention and
  `GET {endpoint}` returns the verified-mention feed. Route-framework details
  never enter this package; the HonoX integration
  (`mountRiebeckiteEndpoints`) mounts the contract on the host router.
- Verification fetches the source through an injectable
  `WebmentionSourceFetcher`, checks for an outbound link to the target, and
  records lightweight citation metadata (title, excerpt, author, publication
  date, and `rel`-derived type). The default fetcher accepts only HTTP(S),
  rejects credentials, limits redirects and response size, times out, rejects
  loopback and private-network hosts after DNS resolution, fails closed when DNS
  resolution fails, and pins the validated address for the connection. On
  runtimes without a DNS module, hostname and literal-IP checks still apply.

## Production storage

The in-memory provider is not durable. For production, use the Cloudflare
adapter and apply its D1 schema before deploying:

```sh
pnpm exec wrangler d1 execute WEBMENTION_DB --file node_modules/@riebeckite/webmention-cloudflare/migrations/0001_webmentions.sql
```

The `env` binding below is provided by your Worker runtime. See the
[Cloudflare integration README](https://github.com/Rerurate514/riebeckite/blob/main/packages/integrations/webmention-cloudflare/README.md)
for the complete wiring.

```ts
import { webmention } from "@riebeckite/plugin-webmention";
import { d1Storage } from "@riebeckite/webmention-cloudflare";

export default {
  plugins: [
    webmention({ provider: d1Storage(env.WEBMENTION_DB) }),
  ],
};
```

Without a provider the plugin uses an in-memory provider, which is fine for
local previews but loses mentions between processes. Supply a durable adapter
(see [`@riebeckite/webmention-cloudflare`](https://github.com/Rerurate514/riebeckite/blob/main/packages/integrations/webmention-cloudflare/README.md))
for production.

## Endpoints

| Method | Path                       | Behavior |
| ------ | -------------------------- | -------- |
| `POST` | `/webmentions` (default)   | Accepts `application/x-www-form-urlencoded` or `application/json` with `source` and `target`. Returns `202` when accepted, `400` with an `error` code when rejected, or `503` when storage is unavailable. |
| `GET`  | `/webmentions` (default)   | Returns the verified-mention feed as JSON: `{ version, generatedAt, count, mentions }`. Supports `?target=`, `?limit=`, and `?since=`. Returns `501` when the provider cannot query. |

Rejection codes: `invalid_request`, `missing_source_or_target`,
`target_not_found`, `invalid_source`, `invalid_target`, `source_unreachable`,
`no_link_found`.

`POST` returns `413` with `payload_too_large` for bodies over 64 KiB. The
endpoint also allows 30 requests per minute per client, using the first
available proxy header (`cf-connecting-ip`, `x-real-ip`, or `x-forwarded-for`)
or a shared `unknown` bucket, and returns `429` with `Retry-After: 60` beyond
that. The limit is per process/isolate and is only a best-effort defense; add
authentication or edge rate limiting for public deployments.

## Rendering

The Site owns JSX placement. Keep the Provider instance in Site composition,
pass that same instance to `webmention()`, then obtain typed component props
with `getWebmentionSectionData`. The helper accepts a `PublicContentView`, so
draft and scheduled entries cannot be rendered.

```tsx
const mentions = await getWebmentionSectionData({
  view,
  slug,
  config,
  provider: webmentionProvider,
});

<WebmentionSection {...mentions} />
```

An empty provider returns an empty model and `WebmentionSection` renders
nothing. The plugin does not inject build-time manifest HTML. Applications can
also call `getWebmentionsForEntry({ manifest, config, provider, slug })` or
consume the JSON feed where a lower-level query is appropriate.

## Options

| Option | Default | Description |
| ------ | ------- | ----------- |
| `provider` | in-memory | Storage adapter implementing `WebmentionProvider`. |
| `endpoint` | `"/webmentions"` | Receive (POST) and feed (GET) path. |
| `headingText` | `"Mentions"` | Heading for the rendered section. |
| `limit` | `20` | Maximum mentions rendered per article. |
| `className` | `"rr-webmention"` | Root CSS class of the rendered section. |
| `allowedTargets` | `[]` | Extra absolute target URLs accepted beyond published entries. |
| `fetchSource` | global `fetch` | Source fetcher override (tests, custom runtimes). |
| `timeoutMs` | `10000` | Source fetch timeout. |
| `maxBytes` | `1000000` | Maximum accepted source document size. |
| `userAgent` | plugin default | `User-Agent` used when verifying. |
| `allowPrivateHosts` | `false` | Allow fetching private-network sources. |
| `nofollow` | `true` | Add `rel="nofollow ugc"` to rendered source links. |

Only JSON-safe values ever reach the browser. The plugin registers no client
entry and no `publicConfig`, and provider credentials never enter options.

## Diagnostics

`addDiagnostics` reports provider capability gaps
(`webmention-render-requires-query`, `webmention-receive-requires-store`). At
manifest time, mentions whose target is not a published entry are reported as
`webmention-unmatched-target`.

## Exports

- `webmention()` / `webmention()`
- `MemoryWebmentionProvider`, provider/capability types and errors
- `parseWebmentionSource`, `findTargetLink`, `verifyWebmention`,
  `createWebmentionSourceFetcher`
- `WebmentionSection`, `getWebmentionSectionData`, `getWebmentionsForEntry`,
  `groupMentionsBySlug`, `buildFeed`
- `resolveWebmentionOptions`, `validateWebmentionOptions`

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
- [@riebeckite/webmention-cloudflare](https://github.com/Rerurate514/riebeckite/blob/main/packages/integrations/webmention-cloudflare/README.md)
