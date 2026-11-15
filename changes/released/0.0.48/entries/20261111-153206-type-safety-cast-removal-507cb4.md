---
packages:
  - "@riebeckite/core"
  - "@riebeckite/runtime"
  - "@riebeckite/node"
type: changed
breaking: true
migration: "`ClientRuntimeInvokeOptions.capability` only accepts the values listed in `RuntimeCapability`. Code that reads `JsonValue` must handle `undefined` property values. Defaulted options and arguments of `defineCliCommand` are typed with every accepted value, so check the annotations that assumed the default literal."
pr: ""
issue: ""
adr: ""
---

Align the public API types with the values the runtime actually produces, and replace the places that hid errors behind a double type assertion with validation. `@riebeckite/core` gains `parseYaml` for YAML parsing and fixture builders for content manifests and plugin contexts. `ClientRuntimeInvokeOptions.capability` is now typed as `RuntimeCapability`, `JsonValue` accepts readonly arrays and `undefined` property values, and defaulted options and arguments of `defineCliCommand` are typed with the accepted values instead of the default literal. `@riebeckite/node` reports a corrupt migration plan as `The migration plan is missing or corrupt.` instead of failing with an internal error.
