---
title: Design Token
sidebar:
  hidden: true
---

# Design Token

Design Tokenは色、余白、フォントなどの名前付きの値で、CSSカスタムプロパティ（`--rb-*`）として定義します。カスケードを通じて、コンポーネントとThemeが安定した語彙を共有できます。

## Tokenのグループ

Coreの`ThemeDesignTokens`は、色、タイポグラフィ、レイアウトの意味のグループを定義します。

| 色                | CSS variable          |
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

| タイポグラフィ       | CSS variable          |
| ---------------- | --------------------- |
| `bodyFont`       | `--rb-font-body`      |
| `headingFont`    | `--rb-font-heading`   |
| `monoFont`       | `--rb-font-mono`      |

| レイアウト           | CSS variable          |
| ---------------- | --------------------- |
| `pageMaxWidth`   | `--rb-layout-page-max` |
| `articleMaxWidth`| `--rb-layout-article-max` |
| `sidebarWidth`   | `--rb-layout-sidebar` |
| `contentGap`     | `--rb-layout-gap`     |

## 意味に基づく参照

コンポーネントとPluginは、特定のThemeの値ではなく、意味（本文の色、背景、アクセント、境界）を参照します。
同じTokenがThemeごとに異なる値へ解決されるため、コンポーネントのコードを触らずにThemeを入れ替えられます。

## 関連用語

- [[glossary/theme|Theme]]
- [[semantic-token|Semantic Token]]
- [[css-contract|CSS Contract]]
- [[glossary/typography|Typography]]

## さらに詳しく

- [Design Tokens](../framework/theme-system/tokens.ja.md)
