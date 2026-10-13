---
title: Design Token
sidebar:
  hidden: true
---

# Design Token

A named value such as a color, spacing, or font exposed as a CSS custom property (--rb-*) that flows through the cascade so components and themes can share a stable vocabulary.

## Token groups

Core's ThemeDesignTokens define semantic groups for color, typography, and layout:

| Color            | CSS variable          |
| ---------------- | --------------------- |
| `paper`          | `--rb-color-paper`    |
| `ink`            | `--rb-color-ink`      |
| `muted`          | `--rb-color-muted`    |
| `accent`         | `--rb-color-accent`   |
| `border`         | `--rb-color-border`   |
| `borderStrong`   | `--rb-color-border-strong` |
| `surface`        | `--rb-color-surface`  |
| `surfaceHover`   | `--rb-color-surface-hover` |
| `overlay`        | `--rb-color-overlay`  |
| `danger`         | `--rb-color-danger`   |
| `success`        | `--rb-color-success`  |
| `codeBackground` | `--rb-color-code-background` |

| Typography       | CSS variable          |
| ---------------- | --------------------- |
| `bodyFont`       | `--rb-font-body`      |
| `headingFont`    | `--rb-font-heading`   |
| `monoFont`       | `--rb-font-mono`      |

| Layout           | CSS variable          |
| ---------------- | --------------------- |
| `pageMaxWidth`   | `--rb-layout-page-max` |
| `articleMaxWidth`| `--rb-layout-article-max` |
| `sidebarWidth`   | `--rb-layout-sidebar` |
| `contentGap`     | `--rb-layout-gap`     |

## Semantic purpose

Components and plugins reference a meaning (body color, background, accent, border) rather than a theme-specific value.
This enables theme swapping without touching component code — the same token resolves to different values per theme.

```css
/* good */
.rr-example {
  color: var(--rb-color-ink);
  background: var(--rb-color-surface);
}

/* avoid */
.rr-example {
  color: #171717;
  background: #f6efe2;
}
```

## Token Definition
The token taxonomy is defined by the `ThemeDesignTokens` type in `packages/core/src/types/theme_config.ts`. Tokens are grouped into three categories — color, typography, and layout — each mapping to CSS custom properties (`--rb-*`):

| Category | Sub-groups | Example CSS variable |
| --- | --- | --- |
| **Color** | paper, ink, muted, accent, border, borderStrong, surface, surfaceHover, overlay, danger, success, codeBackground | `--rb-color-ink`, `--rb-color-surface` |
| **Typography** | bodyFont, headingFont, monoFont | `--rb-font-body`, `--rb-font-heading`, `--rb-font-mono` |
| **Layout** | pageMaxWidth, articleMaxWidth, sidebarWidth, contentGap | `--rb-layout-page-max`, `--rb-layout-sidebar` |

Tokens are authored per-theme and resolved at runtime via `var(--rb-*)` in component styles, enabling theme swapping without code changes.

## CSS Custom Property Adaptation
When a theme is switched, the `--rb-*` custom properties are rewritten by the theme system to match the new color palette typography fonts. Components that reference tokens by meaning (e.g., `--rb-color-ink`) automatically adapt — the same CSS custom property name resolves to different values per theme, so no component changes are needed when the active theme changes.
```

## Related terms

- [[glossary/theme|Theme]]
- [[semantic-token|Semantic Token]]
- [[css-contract|CSS Contract]]
- [[glossary/typography|Typography]]

## Learn more

- [Design Tokens](../framework/theme-system/tokens.md)
