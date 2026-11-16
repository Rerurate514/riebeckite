---
packages:
  - "@riebeckite/core"
  - "@riebeckite/plugin-l10n"
  - "@riebeckite/plugin-breadcrumbs"
type: added
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Cache verified development route metadata between process restarts, including supported plugin route state, to reduce startup work for unchanged content.
