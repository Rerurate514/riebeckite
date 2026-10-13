---
title: Design Token
sidebar:
  hidden: true
---

# Design Token

デザイン トークンは色、間隔、フォントなどの名前付き値で、CSS カスタムプロパティ (--rb-*) として定義され、カスケードを通じてコンポーネントとテーマが安定した語彙を共有できるようにします。

## トークングループ

Core's ThemeDesignTokens は色、タイポグラフィ、レイアウトの意味的グループを定義します:

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

## 意味的目的

コンポーネントとプラグインは特定のテーマ値を参照するのではなく、意味（本文の色、背景、アクセント、境界）を参照します。
これにより、同じトークンがテーマごとに異なる値に解決されるため、コンポーネントコードを触らずにテーマの入れ替えが可能になります。

## 関連用語

- [[glossary/theme|Theme]]
- [[semantic-token|セマンティック トークン]]
- [[css-contract|CSS コントラクト]]
- [[glossary/typography|タイポグラフィ]]

## さらに詳しく

- [Design Tokens](../framework/theme-system/tokens.ja.md)
