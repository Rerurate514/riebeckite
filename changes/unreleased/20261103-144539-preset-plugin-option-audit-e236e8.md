---
packages:
  - "create-riebeckite"
type: fixed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Stop emitting the unsupported `prefix` option for `textFragment` in the `showcase` preset. The option was silently ignored, so generated sites now register `textFragment` without options. Generated site configurations are also typechecked against the plugin option types during scaffold validation.
