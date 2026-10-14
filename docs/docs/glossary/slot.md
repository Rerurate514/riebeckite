---
title: Body slot
sidebar:
  hidden: true
---

# Body slot
A plugin can contribute an HTML fragment to a named position in the site-owned article layout via `appendContentBodySlot`; slots accumulate in resolved plugin order and the site chooses where and whether to render each.

## Standard slots
Core defines slot names as `ContentBodySlot`: `article.header`, `article.metadata`, `article.aside`, `article.before-content`, `article.after-content`, `article.footer`. Custom slot names are also accepted.

## Rendering
The site reads `entry.bodySlots` and renders chosen slots. Slots can be rendered using the `ContentSlot` primitive from `@riebeckite/honox/ui`. Slots accumulate in resolved plugin order: earlier plugin contributions are preserved and new fragments are appended after them.

## Slot type
`ContentBodySlot` is a string type that holds HTML fragments contributed to body positions. Slots are accumulated per plugin in resolution order and stored on the manifest entry.

## Related terms
- [[plugin|Plugin]]
- [[island|Island]]
- [[content-hook|Content hook]]
- [[glossary/diagnostics|Diagnostics]]

## Learn more
- [Plugin API](../reference/plugin-api.md)
- [Theme System](../framework/theme-system.md)