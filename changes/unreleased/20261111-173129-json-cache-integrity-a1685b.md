---
packages:
  - "@riebeckite/core"
  - "@riebeckite/plugin-rename"
type: fixed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Derived View results and content cache entries are now reused only when they survive a JSON round trip, so sparse arrays, negative zero, cyclic values, and dates inside frontmatter arrays no longer change when a cache hit is served. The Markdown sanitize fingerprint now distinguishes regular expressions in the schema, and the rename plugin ignores a corrupt persisted route lock instead of diffing against it.
