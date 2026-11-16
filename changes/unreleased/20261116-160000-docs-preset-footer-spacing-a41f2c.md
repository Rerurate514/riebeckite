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

The docs preset leaves the same space below the previous and next documentation links as the Riebeckite website. The preset had the spacing rule under the class name the website's own article component uses, so a generated docs site ran the links into the site footer with no gap. The "Powered by Riebeckite" line also picks up the muted small-print styling the other presets give it.
