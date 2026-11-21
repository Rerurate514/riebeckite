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

MCP is a thin adapter over the development-only Bridge. It provides previews, publication state, diagnostics, links, content inventory and bodies, and mutation validation. `riebeckite_plugin_catalog` also searches the public npm registry for published `@riebeckite/plugin-*` packages; it is read-only and needs network access. Riebeckite remains the source of truth for local site state.

Only use manual setup when necessary. In that case, give both the development server and `@riebeckite/mcp` the same `RIEBECKITE_BRIDGE_TOKEN`, with at least 32 characters.

Mutation tools are opt-in. Set `RIEBECKITE_BRIDGE_MUTATION_TOKEN` and `RIEBECKITE_BRIDGE_MUTATION_APPROVAL_TOKEN` (each at least 32 characters and different) for both the development server and the MCP process. `riebeckite_mutation_plan` creates a stored plan without changing content. `riebeckite_mutation_apply` succeeds only after a human runs `npm exec riebeckite bridge approve <plan-id>` in an interactive terminal with the approval token; approval expires after five minutes and can be used once. Without the mutation token, the tools return an error.
