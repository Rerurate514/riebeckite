---
packages:
  - "@riebeckite/honox"
  - "@riebeckite/dev-inspector"
type: fixed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Record diagnostics from `inspectGeneratedHtml` on the completed build snapshot instead of only writing them to the build log. Snapshot consumers such as the Development Inspector can now read them.
