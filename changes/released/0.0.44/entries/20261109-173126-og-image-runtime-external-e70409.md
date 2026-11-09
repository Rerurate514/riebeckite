---
packages:
  - "@riebeckite/honox"
  - "@riebeckite/og-image"
type: fixed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

OG images load satori and sharp only when a page needs them, and the standalone SSG bundle keeps `@riebeckite/og-image` external. A site-level `pnpm-workspace.yaml` is no longer read as the monorepo root, so sites using the og-image plugin build under both npm and pnpm.
