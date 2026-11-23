---
packages:
  - "@riebeckite/dev-inspector"
  - "@riebeckite/preview"
  - "@riebeckite/runtime"
  - "@riebeckite/honox"
  - "@riebeckite/plugin-diagnostics"
  - "@riebeckite/plugin-image-optimizer"
type: added
breaking: false
migration: ""
pr: "16"
issue: ""
adr: ""
---

The development Bridge now exposes `context`, `schema`, `inventory`, `links`, and `content` endpoints, adds a `since` snapshot mode to `diagnostics`, and accepts `mutations/validate` under the normal Bridge token so clients can check mutation operations without creating an approvable plan. The preview, runtime, honox, diagnostics, and image-optimizer packages only consolidate internal module files; their published behavior is unchanged.
