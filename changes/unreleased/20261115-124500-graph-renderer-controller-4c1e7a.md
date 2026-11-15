---
packages:
  - "@riebeckite/graph"
type: fixed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

The graph renderer no longer throws while it is created. Its camera, drawing, and animation controllers now receive the renderer context when they are created, so resizing, updating, zooming, and drawing use that context instead of a missing argument. Local graphs and the garden explorer draw again instead of leaving an empty canvas.
