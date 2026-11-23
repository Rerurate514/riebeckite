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

New sites scaffolded with a deployment now register `deploy({ provider: "cloudflare-workers" })` in `riebeckite.config.ts`, so content redirects are emitted as Cloudflare Workers `_redirects` files on every build. The dependency is added to `package.json` automatically. For existing sites, `riebeckite deploy setup` now adds the same plugin entry (and the dependency) when the config does not register it yet, leaving any existing registration untouched.
