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

コムポーネントとPluginは、特定のThemeの値ではなく、意味（本文の色、背景、アクセント、境界）を参照します。
同じTokenがThemeごとに異なる値へ解決されるため、コンポーネントのコードを触らずにThemeを入れ替えられます。

## Token Definition
トークンのタキソノミーは`packages/core/src/types/theme_config.ts`の`ThemeDesignTokens`タイプで定義されています。トークンは色、タイポグラフィ、レイアウトの3つのカテゴリにグループ化され、それぞれがCSSカスタムプロパティ(`--rb-*`)にマッピングされます。

| カテゴリ | サブグループ | 例のCSS変数 |
| --- | --- | --- |
| **色** | paper, ink, muted, accent, border, borderStrong, surface, surfaceHover, overlay, danger, success, codeBackground | `--rb-color-ink`, `--rb-color-surface` |
| **タイポグラフィ** | bodyFont, headingFont, monoFont | `--rb-font-body`, `--rb-font-heading`, `--rb-font-mono` |
| **レイアウト** | pageMaxWidth, articleMaxWidth, sidebarWidth, contentGap | `--rb-layout-page-max`, `--rb-layout-sidebar` |

トークンはThemeごとに定義され、ランタイムで`var(--rb-*)`経由でコンポーネントスタイルで解決されます。意味（色、背景など）でトークンを参照するため、テーマを入れ替えてもコンポーネントのコードを変更することなく適応できます。

## CSSカスタムプロパティの適応

テーマが切り替わると、`--rb-*`カスタムプロパティは新しいカラーパレットとタイポグラフィに応じて書き換えられます。意味でトークンを参照するコンポーネントは、アクティブなテーマが変わっても自動的に適応します。コンポーネントコードの変更は不要です。

## 関連用語

- [[glossary/theme|Theme]]
- [[semantic-token|Semantic Token]]
- [[css-contract|CSS の取り決め]]
- [[glossary/typography|Typography]]

## さらに詳しく

- [Design Tokens](../framework/theme-system/tokens.ja.md)
