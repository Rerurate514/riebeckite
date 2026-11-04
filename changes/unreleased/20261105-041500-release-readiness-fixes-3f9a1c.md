---
packages:
  - "@riebeckite/core"
  - "@riebeckite/honox"
  - "@riebeckite/cli"
  - "create-riebeckite"
type: fixed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Plugin pages replace content routes at the same public path, and a collapsed folder page is no longer overwritten by its own redirect. Scaffolded sites declare the runtime packages required by pnpm and Yarn PnP; existing sites must add `@riebeckite/node`, `@riebeckite/runtime`, and `@riebeckite/spa` explicitly. `riebeckite dev` no longer requires managed Bridge environment variables.
