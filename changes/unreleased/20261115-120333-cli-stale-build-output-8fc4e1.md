---
packages:
  - "@riebeckite/cli"
type: fixed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Rebuilding a package removes its previous output directory first, so a published package no longer carries build files left behind by earlier builds. `@riebeckite/cli` 0.0.48 shipped hundreds of unreferenced chunk files that made the unpacked package about 25 MB larger than the built output.
