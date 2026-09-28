---
title: WaveDrom Demo
description: A note that renders a WaveDrom timing diagram from a wavedrom fence.
publish: true
---

# WaveDrom Demo

The block below becomes a WaveDrom figure when the site is built. The diagram
is drawn in the browser after `initWaveDrom` runs.

```wavedrom
{
  "head": { "text": "RIEBECKITE_EXTERNAL_WAVEDROM_MARKER" },
  "signal": [
    { "name": "clk", "wave": "p......" },
    { "name": "RIEBECKITE_EXTERNAL_WAVEDROM_MARKER", "wave": "0.1..0." }
  ]
}
```
