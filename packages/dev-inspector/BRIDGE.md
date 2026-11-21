# Riebeckite Bridge Protocol v1

The Bridge is a development-only editor integration API. Its read capability is
disabled by default; mutations require a separate explicit capability. Start a
site with an explicit pairing token:

```sh
RIEBECKITE_BRIDGE_TOKEN=<at-least-32-character-token> riebeckite dev
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
| `/__riebeckite/bridge/v1/context` | `path` | Return the resolved source, publication, preview, diagnostics, and last-build impact at one revision. |
| `/__riebeckite/bridge/v1/schema` | — | Return protocol endpoint and input-shape discovery. |
| `/__riebeckite/bridge/v1/inventory` | `offset`, `limit`, `query` | Return a paginated, optionally filtered content inventory. |
| `/__riebeckite/bridge/v1/diagnostics` | `path`, `since` | Without `path`, return all build diagnostics; `since` returns unchanged or a full current snapshot. |
| `/__riebeckite/bridge/v1/links` | `path` | Return outbound links, including unresolved links, and inbound links. |
| `/__riebeckite/bridge/v1/content` | `path` | Return the Markdown body of a resolved source within the content root and at most 1 MiB. |
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

`GET /__riebeckite/bridge/v1/context?path=<content-source>` combines the
resolved source with the results of `/publication`, `/preview`, `/diagnostics`,
and `/impact`. It does not read source file contents or predict future build
impact. Clients can use it to obtain a consistent context snapshot before
subscribing to `/events`.

`/inventory` is ordered by slug. `offset` defaults to 0, `limit` defaults to
100 and is capped at 500. `counts` describes the whole inventory while
`page.total` describes the filtered result. The Bridge does not retain previous
diagnostic snapshots: a differing `since` returns `delta: "full"` and current
diagnostics, while a matching revision returns `delta: "unchanged"` and none.

`/content` uses the normal Bridge token. It resolves the manifest source and
filesystem paths, rejects symlink escapes, and returns only
`{ "available": false }` when it cannot safely read the file. It never exposes
an absolute path or reads outside the content root.

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

Publication responses include `publishAt` in both `entry` and `publication` as
an ISO 8601 string or `null` when it is not set. They also include a
`canonicalUrl` resolved from the configured `site.baseUrl` and the entry
permalink, or `null` when no valid public origin is configured. Their optional
`seo` block is derived only from the resolved content manifest entry:

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
arguments. This is a separate capability: the mutation token can create a plan
and apply an already approved plan, but cannot approve one. `POST
/__riebeckite/bridge/v1/mutations/plan` accepts existing content mutation
operations and returns the unmodified `ContentMutationPlan`. A human must review
the persisted plan in an interactive terminal with `riebeckite bridge approve
<plan-id>` before `POST /mutations/<plan-id>/apply` can succeed. Approval is
signed with the approval token and binds the plan ID and content hash; the server
checks that binding, five-minute expiry, and one-time use before applying. Neither
the approval token nor a bearer approval ID crosses HTTP, appears in URLs, or is
returned by the API. Plans stay server-side, and apply uses the existing
fingerprint, lock, journal, backup, and path validation implementation.

`POST /__riebeckite/bridge/v1/mutations/validate` accepts the same operations
under the normal Bridge token and returns a plan without persisting it or
allowing it to be applied. Creating an approvable plan still requires the
mutation capability.
An apply rejected by approval or fingerprint validation returns HTTP 409 with
`applied: false` and the existing `conflicts` shape. An approval rejection
carries one of these codes:

| Code | Condition | Recovery |
| --- | --- | --- |
| `plan-not-found` | The persisted plan is missing, damaged, or does not match its recorded ID and hash. | Create the plan again, then review and approve it. |
| `approval-required` | No approval is stored for the plan. | Run `riebeckite bridge approve <plan-id>`, then apply again. |
| `approval-invalid` | The approval is not bound to this plan, or its signature does not verify. | Create a new plan and approve it; never reuse an approval that fails verification. |
| `approval-used` | The approval was already consumed by an apply. | Create a new plan and approve it; an approval is one-time. |
| `approval-expired` | The five-minute approval lifetime has passed. | Create a new plan, approve it, and apply before the lifetime ends. |
| `approval-claim-conflict` | Another apply claimed the same approval concurrently. | Read the outcome of the concurrent apply, and create a new plan only if it was not applied. |

An apply rejected by the mutation engine's fingerprint or path validation also
returns HTTP 409, with the engine's own conflict code. Every rejection leaves
the content unchanged.

Recovery and rollback intentionally remain CLI-only. They operate on journals
and backups and can restore or delete content; exposing their journal selection
to the editor capability would create a second destructive API. The existing
`riebeckite content recover <journal> --apply` path retains its engine-level
journal, backup, fingerprint, path, and conflict validation.

Future compatible versions may add optional response fields and capabilities.
They must not change or remove v1 fields. Incompatible changes require a new
protocol version and endpoint.
