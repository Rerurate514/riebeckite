# @riebeckite/plugin-webmention

<!-- Generated from docs/docs/plugins/webmention.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Receive Webmentions, verify that the source document really links to the
target, store them through a pluggable provider, and render verified mentions
near articles. The core plugin contains **no Cloudflare, Worker, database, or
vendor code** and depends only on `@riebeckite/core`.

[日本語](./README_ja.md)

## Design

- `WebmentionProvider` is the storage/runtime seam: it advertises
  `store` / `query` capabilities and exposes `store(mention)` and
  `query(query)`. Credentials, database handles, and runtime bindings stay
  inside the adapter and never reach plugin options or generated output.
- `MemoryWebmentionProvider` is included for tests, local previews, and as a
  provider contract example. It does not persist across processes/isolates.
- The plugin declares `endpoints`: `POST {endpoint}` receives a Webmention and
  `GET {endpoint}` returns the verified-mention feed. Route-framework details
  never enter this package; the HonoX integration
  (`mountRiebeckiteEndpoints`) mounts the contract on the host router.
- Verification fetches the source through an injectable
  `WebmentionSourceFetcher`, checks for an outbound link to the target, and
  records lightweight citation metadata (title, excerpt, author, publication
  date, and `rel`-derived type). The default fetcher blocks loopback and
  private-network hosts, caps the response size, and times out.

## Usage

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

## Rendering

At `onManifestCreated` the plugin queries the provider once, groups verified mentions by target, and appends a live section to each matching entry. Core synchronizes it with the content the route renders.

Set `render: false` to skip build-time injection. Applications that render at
request time can call `getWebmentionsForEntry({ manifest, config, provider,
slug })` and `renderWebmentionSection(mentions, options)` directly, or consume
the JSON feed.

## Options

| Option | Default | Description |
| ------ | ------- | ----------- |
| `provider` | in-memory | Storage adapter implementing `WebmentionProvider`. |
| `endpoint` | `"/webmentions"` | Receive (POST) and feed (GET) path. |
| `render` | `true` | Append stored mentions to matching entries at manifest time. |
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

- `webmention()` / `webmentionPlugin()`
- `MemoryWebmentionProvider`, provider/capability types and errors
- `parseWebmentionSource`, `findTargetLink`, `verifyWebmention`,
  `createWebmentionSourceFetcher`
- `renderWebmentionSection`, `getWebmentionsForEntry`,
  `groupMentionsBySlug`, `buildFeed`
- `resolveWebmentionOptions`, `validateWebmentionOptions`

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
- [@riebeckite/webmention-cloudflare](https://github.com/Rerurate514/riebeckite/blob/main/packages/integrations/webmention-cloudflare/README.md)
