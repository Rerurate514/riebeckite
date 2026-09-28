---
title: Chart.js Demo
description: A note that renders a Chart.js chart from a chart fence.
publish: true
---

# Chart.js Demo

The block below is turned into a Chart.js figure when the site is built. The
chart is drawn in the browser after `initChartJs` runs.

```chart
{
  "type": "bar",
  "caption": "RIEBECKITE_EXTERNAL_CHARTJS_MARKER",
  "labels": ["Mon", "Tue", "Wed"],
  "datasets": [
    { "label": "Visits", "data": [12, 19, 8] }
  ]
}
```
