---
title: D2 Demo
description: A note that renders a D2 diagram at build time.
publish: true
tags:
  - featured
---

# D2 Demo

The block below is rendered to SVG by the D2 plugin when the site is built.

RIEBECKITE_EXTERNAL_D2_MARKER

```d2
# caption: External D2 fixture
client -> server: request
server -> database: query
database -> server: rows
server -> client: response
```
