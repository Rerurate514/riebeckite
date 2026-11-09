---
packages:
  - "@riebeckite/honox"
type: fixed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Reuse existing SSG output cache entries when a full regeneration produces identical content, instead of copying every output back into the cache on each build.
