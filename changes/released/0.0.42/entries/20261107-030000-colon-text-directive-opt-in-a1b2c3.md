---
packages:
  - "@riebeckite/core"
  - "@riebeckite/plugin-shortcodes"
type: fixed
breaking: true
migration: "If your plugin handles directive nodes, add `remark-directive` to its dependencies and call `pipeline.use(remarkDirective)` in `extendMarkdownPipeline` before your own transform."
pr: ""
issue: ""
adr: ""
---

Stop parsing directive syntax in Core by default so text such as `12:30` and `3:4` stays literal Markdown. The shortcodes plugin now registers `remark-directive` itself.
