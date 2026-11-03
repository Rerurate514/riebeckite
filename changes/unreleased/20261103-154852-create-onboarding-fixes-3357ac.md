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

`create-riebeckite` now prints usage for `--help` and unknown options, explains the non-interactive command when no interactive terminal is available, and omits `npm install` from the post-install next steps when dependencies are already installed.
