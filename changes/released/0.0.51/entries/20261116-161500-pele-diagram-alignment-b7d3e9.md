---
packages:
  - "@riebeckite/plugin-mermaid-pele"
type: changed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Mermaid diagrams line up with the article text. The plugin's figure kept the browser's default 40px side margins because the framework only sets the block margins on figures, and the diagram was centered inside its canvas, so every diagram sat narrower and indented compared with the surrounding text.
