---
title: Article Layout
sidebar:
  hidden: true
---

# Article Layout

The article layout preset (`article`, `sidebar`, `full-width`) determines the article area's presentation through the `data-article-layout` attribute on the theme root. It controls the width and sidebar configuration without changing the route or component tree.

## Presets

`article` — Standard article layout with side area
`sidebar` — Sidebar-focused layout
`full-width` — Full-width article without sidebar

The preset is set via `data-article-layout` attribute on the theme root and reflected in CSS rules scoped to the theme name.

## Boundary

A theme defines the presentation of a layout preset; it does not replace the route or the component tree.
The application provides the component structure; the theme provides presentation through data attributes and CSS.

## Related terms

- [[glossary/theme|Theme]]
- [[glossary/typography|Typography]]
- [[glossary/color-mode|Color Mode]]
- [[presentation-layer|Presentation Layer]]

## Learn more

- [Theme System](../framework/theme-system.md)
