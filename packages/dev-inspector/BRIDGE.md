# Riebeckite Bridge Protocol v1

The Bridge is a development-only, read-only API for editor integrations. It is
disabled by default. Start a site with an explicit pairing token:

```sh
riebeckite dev --bridge-token <at-least-32-character-token>
```

The public development-server URL exposes `GET /__riebeckite/bridge/bootstrap`.
It requires `x-riebeckite-bridge-token` and returns a loopback-only private
origin. Clients then request `GET /__riebeckite/bridge/v1` from that origin with
both `x-riebeckite-bridge-token` and `x-riebeckite-bridge-protocol: 1`.

Successful responses contain:

```json
{
  "protocolVersion": 1,
  "server": { "id": "uuid", "version": "0.0.38" },
  "capabilities": ["status", "page-resolution", "preview"],
  "development": {
    "available": true,
    "revision": 0,
    "build": { "status": "ready", "completedAt": 0 }
  },
  "inspection": { "available": true }
}
```

`build` is `{ "status": "unavailable" }` until a completed development build
exists. `GET /__riebeckite/bridge/v1/page?source=<vault-relative-markdown-path>`
uses the completed Content Manifest to resolve a note. It returns its resolved
permalink, visibility, routability, discoverability, locale, revision, and a
production URL only when `site.baseUrl` is configured. It never returns HTML or
tokens; the preview is the public development-server page. A missing or wrong token is 403;
an unsupported protocol is 426 with `INCOMPATIBLE_PROTOCOL` and the supported
versions.

The private listener binds to `127.0.0.1`, rejects non-loopback hosts and
transports, `Origin`, and forwarded headers, and does not enable CORS. It has no
content HTML, diagnostics, mutation, publication, filesystem, or command
execution endpoints. Source paths must be relative and cannot escape the content
root. Tokens are never returned by the API.

Future compatible versions may add optional response fields and capabilities.
They must not change or remove v1 fields. Incompatible changes require a new
protocol version and endpoint.
