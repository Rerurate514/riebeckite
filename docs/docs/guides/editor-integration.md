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

Use `GET /__riebeckite/bridge/v1` to detect supported capabilities. Editor tools can then resolve a source with `/source?path=notes/example.md`, fetch preview, publication, diagnostics, or last-build impact for that source, and subscribe to `/events` to refresh after content changes.

The Bridge is intentionally read-only. It never exposes absolute source paths, does not provide private previews for non-routable content, and does not infer production URLs. Content edits and bulk mutations remain local CLI or application operations until a server-side authorization and approval model exists.

For the request and response contract, see the [Bridge Protocol v1](https://github.com/Rerurate514/riebeckite/blob/main/packages/dev-inspector/BRIDGE.md).
