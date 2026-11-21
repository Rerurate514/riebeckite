# @riebeckite/mcp

MCP server for a local Riebeckite development Bridge. It is a thin adapter:
Riebeckite remains the source of truth for build state, content, diagnostics,
and mutation validation. `riebeckite_plugin_catalog` searches the public npm
registry for published official Plugin packages without changing the site.

[日本語](./README_ja.md)

## Setup

Start `riebeckite dev` with `RIEBECKITE_BRIDGE_TOKEN`, then configure an MCP
client to run this package with:

```json
{
  "command": "npx",
  "args": ["-y", "@riebeckite/mcp"],
  "env": {
    "RIEBECKITE_BRIDGE_DEVELOPMENT_ORIGIN": "http://127.0.0.1:5173",
    "RIEBECKITE_BRIDGE_TOKEN": "your-at-least-32-character-token"
  }
}
```

The server exposes read-only Bridge tools, npm registry Plugin lookup, and
mutation validation. With `RIEBECKITE_BRIDGE_MUTATION_TOKEN` (at least 32
characters) it can also create and apply mutation plans. Set the separate
`RIEBECKITE_BRIDGE_MUTATION_APPROVAL_TOKEN` on both the development server and
the MCP process. A plan does not change content. Applying it requires a human
to run `riebeckite bridge approve <plan-id>`.
