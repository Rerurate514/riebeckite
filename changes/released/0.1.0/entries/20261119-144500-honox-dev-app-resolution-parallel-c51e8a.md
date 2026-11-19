---
packages:
  - "@riebeckite/cli"
  - "@riebeckite/honox"
type: changed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

The Honox Vite plugin starts dev servers about a second sooner by resolving the Riebeckite application in parallel with Vite's own startup instead of awaiting it inside the config hook. Serve mode fires the resolution without blocking the listen step and every request-time hook awaits it on entry, while build mode still resolves synchronously in the config phase, so generated sites behave exactly as before.
