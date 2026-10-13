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

## Related terms

- [[glossary/theme|Theme]]
- [[semantic-token|Semantic Token]]
- [[css-contract|CSS Contract]]
- [[glossary/typography|Typography]]

## Learn more

- [Design Tokens](../framework/theme-system/tokens.md)
