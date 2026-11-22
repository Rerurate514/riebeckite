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

Mutation tools are opt-in. The shortest path is:

```sh
npm exec -- riebeckite ai mcp --mutations
```

This generates temporary mutation and approval tokens for the run. The approval token is stored in `.riebeckite/bridge/approval-token` (git-ignored) so `bridge approve` can read it without an environment variable; it is removed when the MCP process exits. `riebeckite_mutation_plan` creates a stored plan without changing content. `riebeckite_mutation_apply` succeeds only after a human runs `npm exec riebeckite bridge approve <plan-id>` in an interactive terminal; approval expires after five minutes and can be used once. Without mutation mode or a mutation token, the tools return an error.

For a manual or editor setup, set `RIEBECKITE_BRIDGE_MUTATION_TOKEN` and `RIEBECKITE_BRIDGE_MUTATION_APPROVAL_TOKEN` (each at least 32 characters and different) for both the development server and the MCP process. Run `bridge approve` with the same approval token.
