---
packages:
  - "@riebeckite/cli"
type: added
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Added `riebeckite ai mcp --mutations`, which generates temporary Bridge mutation and approval tokens for the session. The approval token is stored in the git-ignored `.riebeckite/` directory so `riebeckite bridge approve` works without environment variables.
