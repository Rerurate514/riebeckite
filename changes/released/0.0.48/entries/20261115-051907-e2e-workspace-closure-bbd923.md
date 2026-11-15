---
packages:
  - "@riebeckite/test"
type: added
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Expose `collectWorkspacePackageClosure` from the E2E helpers so external-site tests pack the full workspace dependency closure of the packages under test, keeping packed tarballs installable without manual dependency lists.
