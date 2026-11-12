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

Content mutations and migrations now verify lock ownership before journal and content writes, so a process that lost its lock cannot overwrite or delete state owned by another process. Stale-lock reclamation removes a lock or guard only when its content still matches the stale copy it inspected, and apply preserves files that are created, replaced, or deleted between verification and the write.
