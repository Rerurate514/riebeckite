---
packages:
  - "@riebeckite/ui"
  - "@riebeckite/plugin-code-tabs"
  - "@riebeckite/plugin-source-files"
  - "@riebeckite/plugin-local-graph"
  - "create-riebeckite"
type: changed
breaking: true
migration: "Replace `import \"@riebeckite/ui/drawer/client\"` with an explicit `initDrawers({ signal })` call inside the page initializer. Migrate code-tabs off `CodeTabsClientOptions` to the new `initCodeTabs()` client export (cache key becomes `code-tabs-v3`). Users importing `@riebeckite/ui/tabs` must move to the code-tabs island or their own implementation."
pr: ""
issue: ""
adr: ""
---

Replaced the drawer's self-initializing side-effect import with an explicit `initDrawers({ signal })` API (preset scaffolds and website already rewired, `:target` フォールバックや `data-rb-*` プロトコルは不変). code-tabs is now a hooks island: one SSR-hydrated `CodeTabsGroup` component via `hydrateRoot`, a `data-code-tabs-props` payload with sanitizer support, and a cache version bump to v3. Removed the dead `./tabs` export from `@riebeckite/ui` (createTabs) and the provably-dead `spa:navigation` listener in source-files. Fixed the local-graph hydration payload to `{ graph, showExplorerLink }` so the explorer link survives hydration. Added the interactive-roots decision guide (hydrateRoot vs createRoot) and refreshed the UI docs accordingly.
