---
packages:
  - "create-riebeckite"
type: fixed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Scaffolded sites now ship a `pnpm-workspace.yaml` that approves the packages pnpm 12 insists on building (esbuild, puppeteer, sharp), so the first `pnpm install` finishes instead of failing with `ERR_PNPM_IGNORED_BUILDS`.
