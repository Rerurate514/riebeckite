---
packages:
  - "@riebeckite/honox"
  - "@riebeckite/cli"
type: fixed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Do not reuse Vite's internal plugins when the SSG bundle is built, so generated sites keep building with Vite 8.4 and later.
