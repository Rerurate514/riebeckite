---
packages:
  - "@riebeckite/core"
  - "@riebeckite/dev-inspector"
type: added
breaking: true
migration: "If you construct CompletedContentBuildSnapshot yourself, add the new inspectorTabs and finalHtmlDiagnostics fields."
pr: ""
issue: ""
adr: ""
---

Add an `inspector` plugin extension for Development Inspector tabs. Plugins can contribute build-time data tabs or a custom client module, and Inspector now addresses tabs by stable ids instead of numeric indexes.
