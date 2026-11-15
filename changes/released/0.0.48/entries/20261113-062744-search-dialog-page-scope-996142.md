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

Load page-scoped client initializers when their presence marker exists anywhere in the document, so a search bar rendered in the site header outside `#main-content` mounts and opens its dialog again.
