---
date: 2026-11-22
title: Bridge API
sidebar.label: Bridge API
sidebar.order: 36
---
# Bridge API

The Bridge is the loopback HTTP interface that `riebeckite dev` exposes through the `riebeckiteBridge` Vite plugin. It lets trusted local clients — the MCP server, editors, other tooling — inspect the running site and stage content mutations. It is not part of the published site and never accepts requests from other machines.

## Enabling the Bridge

Export the plugin with a token of at least 32 characters:

```ts
import { riebeckiteBridge } from "@riebeckite/dev-inspector";

export default riebeckiteBridge({
  token: process.env.RIEBECKITE_BRIDGE_TOKEN!,
  contentRoot: "content",
});
```

Without a valid token the plugin stays inert. Content mutations additionally require `mutationToken` and `mutationApprovalToken`, both 32+ characters and different from each other; the mutation endpoints return `404` while they are unset. `riebeckite ai mcp --mutations` generates both tokens for the session.

## Connecting

The Bridge runs on its own private loopback server with a random port. Clients first ask the dev server for its origin:

```bash
curl -H "x-riebeckite-bridge-token: $RIEBECKITE_BRIDGE_TOKEN" \
  http://127.0.0.1:5173/__riebeckite/bridge/bootstrap
# → {"origin":"http://127.0.0.1:51731"}
```

All further requests go to that origin under `/__riebeckite/bridge/v1`. The MCP server implements this handshake for you; see [MCP server](../guides/ai/mcp.md).

## Request rules

Every request must carry both headers:

| Header | Value |
| --- | --- |
| `x-riebeckite-bridge-token` | The bridge token |
| `x-riebeckite-bridge-protocol` | `1` |

Only loopback connections are accepted. Requests with an `Origin` header or `Forwarded` / `X-Forwarded-*` / `X-Real-IP` headers are rejected, so browsers and proxies cannot call the Bridge. Token comparison is constant-time. Responses are `application/json; charset=utf-8` with `cache-control: no-store`, except `/v1/events`, which streams `text/event-stream`. JSON request bodies must be objects and are limited to 1 MiB.

## Endpoints

| Endpoint | Query | Purpose |
| --- | --- | --- |
| `GET /v1` | — | Server identity, capabilities, build state |
| `GET /v1/page` | `source` | Resolve a page (Obsidian-compatible) |
| `GET /v1/source` | `path` | Resolve a content source file |
| `GET /v1/preview` | `path` | Preview information for a source |
| `GET /v1/publication` | `path` | Publication information for a source |
| `GET /v1/diagnostics` | `path`, `since` | Site-wide or per-source diagnostics |
| `GET /v1/impact` | `path` | Build impact of a source |
| `GET /v1/context` | `path` | Context around a source |
| `GET /v1/links` | `path` | Links for a source |
| `GET /v1/content` | `path` | Read the text of a source (≤ 1 MiB) |
| `GET /v1/inventory` | `offset`, `limit`, `query` | Paged content inventory |
| `GET /v1/schema` | — | Machine-readable endpoint summary |
| `GET /v1/events` | — | Server-sent events |

### Status

`GET /v1` returns the protocol version, the server identity, the capabilities, and the build state:

```json
{
  "protocolVersion": 1,
  "server": { "id": "…", "version": "…" },
  "capabilities": ["status", "site-identity", "…"],
  "development": {
    "available": true,
    "revision": 7,
    "build": { "status": "ready", "completedAt": "…" }
  },
  "inspection": { "available": true },
  "identity": {
    "siteId": "…",
    "siteName": "…",
    "contentRootId": "…",
    "contentSourceKind": "integrated"
  }
}
```

Check `capabilities` before calling other endpoints. When the server runs without a `contentRoot`, only `status` and `page-resolution` remain.

### Inventory

`query` filters entries by slug and title (case-insensitive substring match). `offset` defaults to 0, `limit` defaults to 100 and is capped at 500. The response is `{ entries, page: { offset, limit, total }, revision }`.

### Schema

`GET /v1/schema` reports the query parameters of the `inventory`, `diagnostics`, `links`, and `content` endpoints plus the request body of `mutations/validate`. Prefer it over this page when writing a client.

### Events

`GET /v1/events` is an SSE stream. It emits `event: state` with `{ revision, build }` on connect and `event: content.changed` with `{ revision }` whenever content changes.

## Content mutations

The three mutation endpoints stage writes through the Plan flow described in [Content mutation](../framework/content-mutation.md). Nothing is written until a human approves the plan with `riebeckite bridge approve <plan-id>`.

| Endpoint | Mutation token header | Effect |
| --- | --- | --- |
| `POST /v1/mutations/validate` | not required | Dry run only; writes nothing |
| `POST /v1/mutations/plan` | required | Saves the plan under `<content>/.riebeckite/mutations/plans/` |
| `POST /v1/mutations/<planId>/apply` | required | Applies an approved plan |

All three take `{ "operations": [...] }` — an array of `ContentMutationOperation` objects — with `content-type: application/json`, and return a `ContentMutationPlan`. `operations` must be a non-empty array, otherwise the response is `400 INVALID_OPERATIONS`.

`validate` checks the operations and needs only the bridge token, so read-only clients can use it too. `plan` stores the plan with a hash and returns it for review. `apply` applies an approved plan; both success and rejection return the plan JSON, with rejections using status `409` and `applied: false`:

| `reason` | Meaning |
| --- | --- |
| `plan-not-found` | No plan with that id exists |
| `approval-required` | The plan has not been approved yet |
| `approval-invalid` | The approval failed signature or hash validation |
| `approval-used` | The approval was already claimed |
| `approval-expired` | The approval is older than five minutes |
| `approval-claim-conflict` | The approval could not be claimed exclusively |

An approval lives for five minutes and can be used once. A human reviews the plan — id, hash, changes, warnings — in the terminal and types `y` to write a signed approval file under `<content>/.riebeckite/mutations/<planId>/`. Editors must not implement their own approval, recovery, or rollback flows ([Editor integration](../guides/editor-integration.md)).

## Status codes

| Status | Body | Meaning |
| --- | --- | --- |
| `400` | `INVALID_REQUEST` or `INVALID_OPERATIONS` | Malformed JSON body, or `operations` is not a non-empty array |
| `403` | none | Bad token, non-loopback connection, or `Origin`/forwarding headers present |
| `404` | none | Unknown path, or mutations on a server without mutation tokens |
| `405` | none | Method not allowed for that path (POST is limited to mutation endpoints) |
| `409` | plan JSON | Apply rejected; see `reason` |
| `415` | none | POST without `content-type: application/json` |
| `426` | `INCOMPATIBLE_PROTOCOL` | Missing or wrong `x-riebeckite-bridge-protocol` header |
| `503` | `BRIDGE_UNAVAILABLE` or `BRIDGE_STATUS_UNAVAILABLE` | The Bridge is not ready yet, or no content snapshot exists yet |

## See also

- [Content mutation](../framework/content-mutation.md)
- [MCP server](../guides/ai/mcp.md)
- [Editor integration](../guides/editor-integration.md)
- [CLI: `bridge approve`](./cli.md)
