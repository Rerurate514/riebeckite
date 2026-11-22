---
packages:
  - "@riebeckite/ai"
  - "@riebeckite/cli"
  - "@riebeckite/diagnostics"
  - "create-riebeckite"
type: added
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Added project-local MCP client configuration to `riebeckite ai setup --client claude|cursor|vscode|opencode`, with merge behavior that preserves existing servers and never overwrites a `riebeckite` entry. Setup now writes `CLAUDE.md` and `.github/copilot-instructions.md`, records the Riebeckite version in `RIEBECKITE_AI.md`, and uses the detected npm or pnpm commands. `riebeckite doctor` reports incomplete AI guidance, outdated rules or Skills, and a missing MCP dependency.
