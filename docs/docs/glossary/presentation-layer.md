---
date: 2026-10-14
title: Presentation Layer
sidebar:
  hidden: true
---

# Presentation Layer

The presentation layer is the theme's responsibility — colors, fonts, spacing, layout, and article style. It does not include content semantics, routes, manifests, plugin behavior, or client scripts.

## What a theme can do
Override or add tokens, define stylesheet rules, declare theme-specific data attributes, provide color mode / typography / layout presets, and override through `userCss` (loads last in the cascade).

## Theme and Color Mode Interaction
Themes interact with color mode through the `data-theme` attribute and semantic tokens. When `colorMode` is `"system"`, the `data-theme` attribute is omitted and the OS preference is detected via `@media (prefers-color-scheme: dark)` query. Themes should not hardcode colors for individual components — instead, use semantic tokens (e.g. `--rb-color-ink`) that resolve appropriately in each color mode.

## What a theme cannot do
Component replacement, JSX injection, Route additions, Adding or removing plugins, Client script execution, DOM transformation, island registration, filesystem access, ContentManager access

## Related terms

- [[glossary/theme|Theme]]
- [[glossary/color-mode|Color Mode]]
- [[article-layout|Article Layout]]
- [[user-css|userCss]]

## Learn more

- [Theme System](../framework/theme-system.md)
