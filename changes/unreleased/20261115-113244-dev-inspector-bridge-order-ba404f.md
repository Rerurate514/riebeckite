---
packages:
  - "@riebeckite/dev-inspector"
type: fixed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

The development inspector registers its bridge middleware before other Vite plugins, so the bridge endpoint answers first when another plugin also handles the same request.
