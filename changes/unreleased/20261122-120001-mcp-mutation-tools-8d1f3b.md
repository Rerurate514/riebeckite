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

Added the `riebeckite_mutation_plan` and `riebeckite_mutation_apply` MCP tools. Mutation remains opt-in through `RIEBECKITE_BRIDGE_MUTATION_TOKEN`; applying a plan still requires a human `riebeckite bridge approve <plan-id>` review.
