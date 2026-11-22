---
packages:
  - "@riebeckite/spa"
type: removed
breaking: true
migration: "Replace `spa({ ... })` with the options object itself: `spa: { ... }` in `riebeckite.config.ts`."
pr: ""
issue: ""
adr: ""
---

Removed the unused `spa()` helper from `@riebeckite/spa`. SPA navigation is configured through the `spa` key in `riebeckite.config.ts`, and the helper never affected the runtime, so existing sites behave the same.
