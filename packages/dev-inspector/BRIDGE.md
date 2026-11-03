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

`GET /__riebeckite/bridge/v1` remains the v1 status endpoint. It reports the
server identity, protocol version, capabilities, current revision, and the last
completed build state. Existing clients can continue to use it unchanged.

When the HonoX development integration supplies a content root, the following
read-only endpoints are advertised as optional capabilities:

| Endpoint | Query | Purpose |
| --- | --- | --- |
| `/__riebeckite/bridge/v1/source` | `path` | Resolve a content source file to its manifest entry. |
| `/__riebeckite/bridge/v1/preview` | `path` | Return the actual local development URL for a routable entry. |
| `/__riebeckite/bridge/v1/publication` | `path` | Return visibility, routing, publication, and redirect state. |
| `/__riebeckite/bridge/v1/diagnostics` | `path` | Return existing content diagnostics related to the source. |
| `/__riebeckite/bridge/v1/impact` | `path` | Return the relevant outputs from the last completed build. |
| `/__riebeckite/bridge/v1/events` | — | Open an authenticated server-sent event stream. |

`path` identifies a Markdown source beneath the configured content root. An
absolute path is accepted only when it resolves beneath that root; all responses
use a root-relative path and never expose an absolute filesystem path. A source
response is `resolved`, `not-found`, `unsupported` for an invalid path, or
`unavailable` while no completed build exists.

Preview does not bypass publishing boundaries. Draft and scheduled entries that
are not publicly routable return `NOT_PUBLICLY_ROUTABLE`. The Bridge reports a
local development URL only; it does not infer or fabricate a production URL.
Diagnostics include only positions supplied by Riebeckite. Build impact is a
last-build result, not a dry-run prediction; `completeness` is `unknown` when a
full regeneration was required.

The event stream first sends `state`, then sends `content.changed` with an
increasing revision whenever the development content watcher invalidates the
Bridge. Re-fetch the relevant endpoint after an event.

The private listener binds to `127.0.0.1`, rejects non-loopback hosts and
transports, `Origin`, and forwarded headers, and does not enable CORS. Tokens
are never returned by the API. A missing or wrong token is 403; an unsupported
protocol is 426 with `INCOMPATIBLE_PROTOCOL` and supported versions.

Mutation is disabled unless `--bridge-mutation-token <at-least-32-character-token>`
is supplied in addition to the read token. This is a separate capability: the
read token can create a plan but cannot approve or apply it. `POST
/__riebeckite/bridge/v1/mutations/plan` accepts existing content mutation
operations and returns the unmodified `ContentMutationPlan`; `POST
/mutations/<plan-id>/approve` requires the mutation token and issues a one-time
approval valid for five minutes; `POST /mutations/<plan-id>/apply` requires both
the mutation token and that approval. Plans stay server-side, and apply uses the
existing fingerprint, lock, journal, backup, and path validation implementation.

Recovery and rollback are intentionally not exposed by Bridge yet. They remain
CLI-only until they have their own destructive-operation approval contract.

Future compatible versions may add optional response fields and capabilities.
They must not change or remove v1 fields. Incompatible changes require a new
protocol version and endpoint.
