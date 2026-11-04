# Riebeckite Bridge Protocol v1

The Bridge is a development-only editor integration API. Its read capability is
disabled by default; mutations require a separate explicit capability. Start a
site with an explicit pairing token:

```sh
riebeckite dev --bridge-token <at-least-32-character-token>
```

The public development-server URL exposes `GET /__riebeckite/bridge/bootstrap`.
It requires `x-riebeckite-bridge-token` and returns a loopback-only private
origin. Clients then make requests to that origin with both
`x-riebeckite-bridge-token` and `x-riebeckite-bridge-protocol: 1`.

`GET /__riebeckite/bridge/v1` is the v1 status endpoint:

```json
{
  "protocolVersion": 1,
  "server": { "id": "uuid", "version": "0.0.38" },
  "capabilities": ["status", "page-resolution"],
  "development": {
    "available": true,
    "revision": 0,
    "build": { "status": "unavailable" }
  },
  "inspection": { "available": false }
}
```

`build` is `{ "status": "unavailable" }` until a completed development build
exists. `revision` is the Bridge state revision: it increases whenever content
changes invalidate the Bridge, and the same value is reported by every endpoint.
`build.completedAt` is the build timestamp and is not the Bridge revision.

When the HonoX development integration supplies a content root, the following
read-only endpoints are advertised as additional capabilities:

| Endpoint | Query | Purpose |
| --- | --- | --- |
| `/__riebeckite/bridge/v1/source` | `path` | Resolve a content source file to its manifest entry. |
| `/__riebeckite/bridge/v1/preview` | `path` | Return the actual local development URL for a routable entry. |
| `/__riebeckite/bridge/v1/publication` | `path` | Return visibility, routing, publication, and redirect state. |
| `/__riebeckite/bridge/v1/diagnostics` | `path` | Return existing content diagnostics related to the source. |
| `/__riebeckite/bridge/v1/impact` | `path` | Return the relevant outputs from the last completed build. |
| `/__riebeckite/bridge/v1/events` | — | Open an authenticated server-sent event stream. |
| `/__riebeckite/bridge/v1/page` | `source` | Protocol v1 compatibility alias for a single-page summary. |

The content-root capabilities include `seo`. It indicates that publication
responses include the optional `seo` block described below.

`path` identifies a Markdown source beneath the configured content root. An
absolute path is accepted only when it resolves beneath that root; all responses
use a root-relative path and never expose an absolute filesystem path. The
source lookup is shared by every endpoint: it matches the path, the path without
its `.md` extension, a manifest alias, a content ID, a permalink, and a unique
suffix such as `hello.md`. A match that is ambiguous is reported as
`unsupported` with `AMBIGUOUS_SOURCE`; it is never resolved by discovery order.

A source response is `resolved`, `not-found`, `unsupported` for an invalid or
ambiguous path, or `unavailable` while no completed build exists. An unavailable
manifest is not the same as a missing page.

`GET /__riebeckite/bridge/v1/page?source=<vault-relative-markdown-path>` is the
Protocol v1 compatibility endpoint used by the Obsidian client. It uses the same
source resolution as `/source` and returns a flat summary:

```json
{
  "status": "resolved",
  "source": "notes/hello.md",
  "page": "/ja/hello/",
  "visibility": "public",
  "routable": true,
  "discoverable": true,
  "locale": "ja",
  "publishAt": null,
  "revision": 0,
  "productionUrl": null
}
```

The compatibility states are `resolved`, `unavailable`, `not-found`, and
`invalid-source`. An ambiguous source returns `unsupported` with its reason. The
endpoint is kept for the lifetime of Protocol v1 and will be removed only with a
future incompatible protocol version, after clients migrate to `/source`,
`/publication`, and `/preview`. It shares their resolution code and does not
duplicate manifest logic.

Preview does not bypass publishing boundaries. Draft and scheduled entries that
are not publicly routable return `NOT_PUBLICLY_ROUTABLE`. The Bridge reports a
local development URL only. A production URL is resolved only from the
configured `site.baseUrl`; it is never inferred or fabricated. Diagnostics
include only positions supplied by Riebeckite. Build impact is a last-build
result, not a dry-run prediction; `completeness` is `unknown` when a full
regeneration was required.

Publication responses include a `canonicalUrl` resolved from the configured
`site.baseUrl` and the entry permalink, or `null` when no valid public origin is
configured. Their optional `seo` block is derived only from the resolved content
manifest entry:

```json
{
  "seo": {
    "title": "Hello",
    "description": "A short description.",
    "canonicalUrl": "https://example.com/ja/hello/",
    "indexable": true,
    "issues": []
  }
}
```

`indexable` is true only for discoverable published content. `issues` are in a
stable order and can contain `MISSING_DESCRIPTION`, `DESCRIPTION_TOO_LONG` (more
than 120 characters), `TITLE_TOO_LONG` (more than 60 characters), and
`NOT_INDEXABLE`.

The event stream first sends `state` with the current revision and build status,
then sends `content.changed` with an increasing revision whenever the
development content watcher invalidates the Bridge. Re-fetch the relevant
endpoint after an event.

The private listener binds to `127.0.0.1`, rejects non-loopback hosts and
transports, `Origin`, and forwarded headers, and does not enable CORS. A missing
or wrong token is 403. An unsupported protocol is 426 with
`INCOMPATIBLE_PROTOCOL` and the supported versions. Tokens are never returned by
the API.

Mutation is disabled unless both `RIEBECKITE_BRIDGE_MUTATION_TOKEN` and
`RIEBECKITE_BRIDGE_MUTATION_APPROVAL_TOKEN` are set to separate values of at
least 32 characters before starting the development server. They are environment
variables rather than command-line options, so they are not exposed in process
arguments. This is a separate capability: the read token can create a plan; the
mutation token can apply an already approved plan but cannot approve one. `POST
/__riebeckite/bridge/v1/mutations/plan` accepts existing content mutation
operations and returns the unmodified `ContentMutationPlan`. A human must review
the persisted plan in an interactive terminal with `riebeckite bridge approve
<plan-id>` before `POST /mutations/<plan-id>/apply` can succeed. Approval is
signed with the approval token and binds the plan ID and content hash; the server
checks that binding, five-minute expiry, and one-time use before applying. Neither
the approval token nor a bearer approval ID crosses HTTP, appears in URLs, or is
returned by the API. Plans stay server-side, and apply uses the existing
fingerprint, lock, journal, backup, and path validation implementation.
An apply rejected by approval or fingerprint validation returns HTTP 409 with the
existing conflict result.

Recovery and rollback intentionally remain CLI-only. They operate on journals
and backups and can restore or delete content; exposing their journal selection
to the editor capability would create a second destructive API. The existing
`riebeckite content recover <journal> --apply` path retains its engine-level
journal, backup, fingerprint, path, and conflict validation.

Future compatible versions may add optional response fields and capabilities.
They must not change or remove v1 fields. Incompatible changes require a new
protocol version and endpoint.
