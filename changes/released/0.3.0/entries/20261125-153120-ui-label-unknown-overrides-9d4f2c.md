---
packages:
  - "@riebeckite/ui"
  - "@riebeckite/dev-inspector"
type: changed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Label resolution now ignores dictionary and override keys that the English dictionary does not define, so `ResolvedUiLabels` and the runtime labels agree. The development inspector lists `ui.labels` entries that no loaded definition uses as unused overrides in the UI labels tab, and the reference documents the process-wide registration behavior of `defineUiLabels` and the ignored empty-string override.
