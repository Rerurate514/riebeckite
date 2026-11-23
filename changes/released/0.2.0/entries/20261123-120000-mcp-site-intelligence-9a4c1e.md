---
packages:
  - "@riebeckite/core"
  - "@riebeckite/ai"
  - "@riebeckite/dev-inspector"
  - "@riebeckite/honox"
  - "@riebeckite/mcp"
type: added
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

The development Bridge and MCP now expose project facts, last-build source impact, response evidence, and mutation plan inspection. The new `@riebeckite/ai` package owns AI configuration, Rules, Skills, and mutation boundaries through `integrations.ai.mutationPolicy`; protected paths override writable paths and are checked when plans are validated, saved, and applied.
