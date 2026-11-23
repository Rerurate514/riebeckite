---
packages:
  - "@riebeckite/mcp"
type: added
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Added the `riebeckite_plugin_catalog` MCP tool, which searches the public npm registry for published `@riebeckite/plugin-*` packages by capability or package name. It is read-only, requires network access, and does not change local site state.
