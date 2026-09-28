---
title: Canvas Demo
description: A note that renders embedded Obsidian canvas files.
publish: true
tags:
  - featured
---

# Canvas Demo

A direct embed of an external canvas file:

![[canvas/diagram.canvas]]

A `canvas` fence that embeds the same file:

```canvas
![[canvas/diagram.canvas]]
```

A `canvas` fence with inline JSON Canvas:

```canvas
{
  "nodes": [
    {
      "id": "inline",
      "type": "text",
      "x": 0,
      "y": 0,
      "width": 240,
      "height": 100,
      "text": "Inline canvas node"
    }
  ],
  "edges": []
}
```
