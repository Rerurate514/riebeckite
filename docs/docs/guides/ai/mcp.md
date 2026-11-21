---
date: 2026-11-22
title: Connect MCP
sidebar.label: MCP
---
# Connect MCP

Register this stdio command with an AI client:

```sh
npm exec riebeckite ai mcp
```

It starts the local development server and MCP server, generating a temporary Bridge token for that run. The client configuration does not need the token.

MCP is a thin adapter over the development-only Bridge. It provides previews, publication state, diagnostics, links, content inventory and bodies, and mutation validation. Riebeckite remains the source of truth.

Only use manual setup when necessary. In that case, give both the development server and `@riebeckite/mcp` the same `RIEBECKITE_BRIDGE_TOKEN`, with at least 32 characters.
