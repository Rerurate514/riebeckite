---
title: Graphviz Demo
description: A note that renders a Graphviz DOT diagram at build time.
publish: true
---

# Graphviz Demo

The block below is rendered to SVG by the Graphviz WASM renderer at build time.

```dot
// caption: External Graphviz demo
digraph {
  rankdir="LR"
  start [label="RIEBECKITE_EXTERNAL_GRAPHVIZ_MARKER"]
  render [label="render"]
  start -> render
}
```

RIEBECKITE_EXTERNAL_GRAPHVIZ_MARKER
