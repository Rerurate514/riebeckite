---
packages:
  - "create-riebeckite"
type: changed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

The docs preset shell renders the documentation sidebar once instead of twice. The desktop sidebar column is now the docs navigation drawer panel styled as a sticky column from 48rem, and the separate always-present mobile copy of the sidebar markup is gone, so every docs page ships roughly half the sidebar DOM (links and list items) it did before. Sites generated from earlier presets keep working; only sites that copied the shell layout into their own routes and styled it against the removed `aside.site-sidebar` need to re-adopt the new layout.
