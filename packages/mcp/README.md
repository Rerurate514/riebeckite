# @riebeckite/mcp

MCP server for a local Riebeckite development Bridge. It is a thin adapter:
Riebeckite remains the source of truth for build state, content, diagnostics,
and mutation validation.

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

The server exposes read-only Bridge tools and mutation validation. It cannot
create or apply mutation plans; those still require Riebeckite's explicit
mutation capability and human approval.
