---
title: Vega-Lite Demo
description: A note that renders a Vega-Lite chart in the browser.
publish: true
tags:
  - featured
---

# Vega-Lite Demo

The block below carries a Vega-Lite specification. The plugin emits it as a
figure and the chart is drawn in the browser.

```vega-lite
{
  "title": "RIEBECKITE_EXTERNAL_VEGALITE_MARKER",
  "description": "A minimal bar chart emitted by the Vega-Lite plugin.",
  "data": {
    "values": [
      { "category": "A", "value": 28 },
      { "category": "B", "value": 55 },
      { "category": "C", "value": 43 }
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": { "field": "category", "type": "nominal" },
    "y": { "field": "value", "type": "quantitative" }
  }
}
```
