---
packages:
  - "@riebeckite/node"
type: fixed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Content mutations now retry when Windows reports that a content file is in use, so an apply no longer fails with EPERM while another process is reading the same file. Stale lock reclamation is serialized through a guard file and removes the stale lock directly, so two processes can no longer both believe they hold the lock.
