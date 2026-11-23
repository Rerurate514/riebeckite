---
packages:
  - "@riebeckite/core"
  - "@riebeckite/plugin-permalink"
  - "@riebeckite/cli"
type: changed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Development route-cache fingerprints now use content source metadata (`modifiedAt` and `size`) instead of rereading and hashing every file, so a warm dev-server start no longer re-reads the whole vault. The route cache version was bumped, so existing saved state is recomputed once. Plugins that participate in development route caching through content locations, localization, or route manifest hooks must now declare `developmentRouteCache`; a missing descriptor fails startup with an error naming the plugin instead of silently disabling the cache. The `permalink` plugin and the plugin generator's `urls` template now declare this contract.
