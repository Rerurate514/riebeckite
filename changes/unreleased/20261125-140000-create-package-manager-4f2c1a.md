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

Generated sites can use npm (the default) or pnpm, selected with the new `Which package manager?` prompt or `--package-manager <npm|pnpm>` on `create-riebeckite` and `riebeckite init`. pnpm sites pin `pnpm@11.5.3`, print pnpm commands, and generate a workflow that installs with `pnpm install --frozen-lockfile`.
