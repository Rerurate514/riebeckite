---
date: 2026-11-04
title: Editor integration
sidebar:
  label: Editor integration
---
# Editor integration

Riebeckite can expose a local, development-only Bridge for an editor extension or other local tool. It resolves a Markdown source file to the existing content manifest and reports the same preview, publication, diagnostics, and last-build impact data used by the development server.

Start development with an explicit pairing token:

```sh
riebeckite dev --bridge-token <at-least-32-character-token>
```

The Bridge is disabled without this token. First request `GET /__riebeckite/bridge/bootstrap` from the development server with `x-riebeckite-bridge-token`. Use the returned loopback origin for all Bridge requests, adding both that token and `x-riebeckite-bridge-protocol: 1`.

Use `GET /__riebeckite/bridge/v1` to detect supported capabilities. Editor tools can then resolve a source with `/source?path=notes/example.md`, fetch preview, publication, diagnostics, or last-build impact for that source, and subscribe to `/events` to refresh after content changes. The `/page?source=notes/example.md` endpoint is kept as a Protocol v1 compatibility alias for the Obsidian client, and shares its resolution code with `/source`. New integrations should use `/source`, `/publication`, and `/preview`.

The Bridge is read-only by default. It never exposes absolute source paths, does not provide private previews for non-routable content, and does not infer production URLs. Mutation requires separate `RIEBECKITE_BRIDGE_MUTATION_TOKEN` and `RIEBECKITE_BRIDGE_MUTATION_APPROVAL_TOKEN` environment variables, each at least 32 characters and with different values. A client can create a plan and apply it only after an interactive `riebeckite bridge approve <plan-id>` review; approval stays server-side, expires after five minutes, and can be used once. Recovery and rollback remain CLI-only.

For the request and response contract, see the [Bridge Protocol v1](https://github.com/Rerurate514/riebeckite/blob/main/packages/dev-inspector/BRIDGE.md).
