---
packages:
  - "@riebeckite/honox"
  - "@riebeckite/dev-inspector"
type: changed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

The Honox integration and the development inspector load most of their module graph lazily, and the bundled Riebeckite config is cached on disk under `.riebeckite/config-bundle`, so dev servers start several seconds sooner. Import edges to `@riebeckite/core`, `@riebeckite/node`, `@riebeckite/diagnostics` and other heavy dependencies now resolve inside the functions that need them, which keeps every public signature unchanged. The config bundle cache is keyed by the resolved config file path, the esbuild version, and content digests of every bundled input plus the workspace package manifests, and it rebuilds automatically whenever any recorded input changes.
