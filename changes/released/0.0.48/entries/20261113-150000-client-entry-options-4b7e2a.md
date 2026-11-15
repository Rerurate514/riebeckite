---
packages:
  - "@riebeckite/core"
  - "@riebeckite/honox"
  - "@riebeckite/cli"
  - "@riebeckite/plugin-search"
type: changed
breaking: true
migration: "Replace the positional createClientEntry arguments with an options object: createClientEntry(\"name\", { moduleSpecifier, exportName, publicConfig, scope, initializerArguments, presenceSelector, root, runtimeEntries }). Set root: \"document\" for a page entry whose presence marker is outside main#main-content."
pr: ""
issue: ""
adr: ""
---

Replace the positional `createClientEntry` signature with a single options object. Client entries can set `root: "document"` when their presence marker lives in the site shell, receive the matched marker as `context.marker`, and app-scoped conditional entries are re-evaluated after SPA navigation.
