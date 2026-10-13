---
title: Presentation Layer
sidebar:
  hidden: true
---

# Presentation Layer

The presentation layer is the theme's responsibility — colors, fonts, spacing, layout, and article style. It does not include content semantics, routes, manifests, plugin behavior, or client scripts.

## What a theme can do

Override or add tokens
Define stylesheet rules
Declare theme-specific data attributes
Provide color mode / typography / layout presets
Override through `userCss` (loads last in the cascade)

## What a theme cannot do

Component replacement
JSX injection
Route additions
Adding or removing plugins
Client script execution
DOM transformation, island registration, filesystem access, ContentManager access

## Related terms

- [[glossary/theme|Theme]]
- [[glossary/color-mode|Color Mode]]
- [[article-layout|Article Layout]]
- [[user-css|userCss]]

## Learn more

- [Theme System](../framework/theme-system.md)
