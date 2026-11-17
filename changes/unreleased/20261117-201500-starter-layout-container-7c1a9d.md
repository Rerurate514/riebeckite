---
packages:
  - "create-riebeckite"
type: changed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

The starter preset places its file explorer inside the article grid, so the explorer, article and table of contents share one centered page container. The navigation no longer hugs the viewport edge, the table of contents sits beside the article instead of the page edge, and the header and footer align with the same container. The explorer and table of contents appear from 80rem; below that the article stays a single centered column.
