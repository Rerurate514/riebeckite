---
packages:
  - "@riebeckite/mcp"
type: security
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Update Zod to 4.6.7 to remove the advisory for memory exhaustion while validating oversized constrained collections. `@modelcontextprotocol/sdk` 1.32.2 accepts Zod 4, so the schemas are unchanged.
