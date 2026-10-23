---
date: 2026-10-14
title: CSS Contract
sidebar:
  hidden: true
---
# CSS Contract

The stable CSS hooks and cascade order that components may rely on. Themes expose documented hooks (rb-* and rr-*) so components can style without hardcoding a specific theme.

## Stable hooks
Two class namepaces are provided:
- `rb-*` — structural hooks and semantic design tokens provided by the framework ('.rb-theme-root', '.rb-site', '.rb-article', '.rb-article-body', etc.)
- `rr-<feature>` — root hooks on the outermost element rendered by a plugin ('.rr-search', '.rr-callout', etc.)

## Cascade order
Load order guarantees theme CSS wins over plugins and `userCss` is the final override:

framework structural CSS → base/app structural CSS → Plugin default CSS → Theme CSS → config token inline style → userCss

```mermaid
flowchart TD
  Base[Base / App Structural CSS]
  Plugin[Plugin Default CSS]
  Theme[Theme CSS]
  Token[Config Token Inline Style]
  User[userCss]
  Base --> Plugin
  Plugin --> Theme
  Theme --> Token
  Token --> User
```

## Cascade Order Verification
The guaranteed cascade order is: framework structural CSS → base/app structural CSS → Plugin default CSS → Theme CSS → config token inline style → userCss. This order is enforced by `@riebeckite/honox` which generates separate stylesheets for each layer with header comments noting their cascade position. `userCss` is the final override — ideal for small site-specific tweaks.

## Theme CSS Writing Guidelines
A theme should style only stable hooks and documented descendant elements. Do not invent new `rb-*` / `rr-*` class names. Target only `.rb-site`, `.rb-article`, `.rb-article-layout`, `.rb-article-header`, `.rb-article-body`, `.rb-article-content`, `.rb-article-meta`, `.rb-article-footer`, `.rb-sidebar`, and the `rr-*` plugin roots documented by each plugin. BEM elements (`__…`) and modifiers (`--…`) are internal implementation details.

## Related terms
- [[glossary/theme|Theme]]
- [[design-token|Design Token]]
- [[glossary/typography|Typography]]
- [[glossary/color-mode|Color Mode]]

## Learn more
- [CSS](../framework/theme-system/css.md)