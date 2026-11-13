---
packages:
  - "@riebeckite/honox"
type: added
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

When SPA navigation is enabled, the build now reports an error diagnostic for every generated HTML page that lacks `<main id="main-content">`. Redirect pages are skipped. `riebeckite check` fails on these diagnostics by default.
