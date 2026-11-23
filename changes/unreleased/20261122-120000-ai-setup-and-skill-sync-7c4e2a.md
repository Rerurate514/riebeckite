---
packages:
  - "create-riebeckite"
  - "@riebeckite/cli"
type: added
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Added `riebeckite ai setup`, which installs generated Skills, AI guidance, the MCP dependency, and the `content:lint` script in an existing project. Scaffolds now generate `AGENTS.md` alongside `RIEBECKITE_AI.md`. `riebeckite skills sync` now adds missing Skills and files instead of only updating existing Skills, and preserves the project's content directory, title, and locale.
