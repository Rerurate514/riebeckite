---
title: Bases Demo
description: A note that renders an Obsidian Base at build time.
publish: true
tags:
  - featured
---

# Bases Demo

The block below is rendered from the content manifest when the site is built.

```base
filters:
  and:
    - file.hasTag("featured")
properties:
  file.name:
    displayName: Title
  file.tags:
    displayName: Tags
views:
  - type: table
    name: RIEBECKITE_EXTERNAL_BASES_MARKER
    order:
      - file.name
      - file.tags
    limit: 10
```
