---
packages:
  - "@riebeckite/core"
  - "@riebeckite/node"
  - "@riebeckite/diagram"
  - "@riebeckite/plugin-bases"
  - "@riebeckite/plugin-canvas"
  - "@riebeckite/plugin-d2"
  - "@riebeckite/plugin-dataview"
  - "@riebeckite/plugin-flashcards"
  - "@riebeckite/plugin-frontmatter-transformer"
  - "@riebeckite/plugin-graphviz"
  - "@riebeckite/plugin-map"
  - "@riebeckite/plugin-markmap"
  - "@riebeckite/plugin-marp"
  - "@riebeckite/plugin-mermaid"
  - "@riebeckite/plugin-mermaid-pele"
  - "@riebeckite/plugin-plantuml"
  - "@riebeckite/plugin-qr-code"
  - "@riebeckite/plugin-rich-embed"
  - "@riebeckite/plugin-vega-lite"
  - "@riebeckite/plugin-wavedrom"
type: changed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Content migration plans now reject malformed diagnostics, conflicts, selections, and skipped records instead of accepting them through type casts. Diagram and embed plugins also validate their incoming options with shared guards rather than unchecked casts. Core also exports the RiebeckiteIntegrations type and new VFile diagnostic helpers for plugin authors.
