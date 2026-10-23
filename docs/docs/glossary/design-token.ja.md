---
date: 2026-10-14
title: デザイントークン（Design Token）
sidebar:
  hidden: true
---

# デザイントークン（Design Token）

色、余白、フォントなどの名前付きの値で、CSSカスタムプロパティ（`--rb-*`）として公開します。カスケードを通じて流れるため、コンポーネントとテーマが安定した語彙を共有できます。

## トークンのグループ

Coreの`ThemeDesignTokens`は、色、タイポグラフィ、レイアウトの意味のグループを定義します。

| 色 | CSS変数 |
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

| タイポグラフィ | CSS変数 |
| ---------------- | --------------------- |
| `bodyFont`       | `--rb-font-body`      |
| `headingFont`    | `--rb-font-heading`   |
| `monoFont`       | `--rb-font-mono`      |

| レイアウト | CSS変数 |
| ---------------- | --------------------- |
| `pageMaxWidth`   | `--rb-layout-page-max` |
| `articleMaxWidth`| `--rb-layout-article-max` |
| `sidebarWidth`   | `--rb-layout-sidebar` |
| `contentGap`     | `--rb-layout-gap`     |

## 意味に基づく参照

コンポーネントとプラグインは、テーマ固有の値ではなく、意味（本文の色、背景、アクセント、境界）を参照します。
これにより、コンポーネントのコードを触らずにテーマを入れ替えられます。同じトークンがテーマごとに異なる値へ解決されます。

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

## トークンの定義
トークンの分類は`packages/core/src/types/theme_config.ts`の`ThemeDesignTokens`型で定義されています。トークンは色、タイポグラフィ、レイアウトの3つのカテゴリに分かれ、それぞれがCSSカスタムプロパティ（`--rb-*`）に対応します。

| カテゴリ | サブグループ | CSS変数の例 |
| --- | --- | --- |
| **色** | paper, ink, muted, accent, border, borderStrong, surface, surfaceHover, overlay, danger, success, codeBackground | `--rb-color-ink`, `--rb-color-surface` |
| **タイポグラフィ** | bodyFont, headingFont, monoFont | `--rb-font-body`, `--rb-font-heading`, `--rb-font-mono` |
| **レイアウト** | pageMaxWidth, articleMaxWidth, sidebarWidth, contentGap | `--rb-layout-page-max`, `--rb-layout-sidebar` |

トークンはテーマごとに定義し、実行環境でコンポーネントのスタイルから`var(--rb-*)`として解決します。これにより、コードを変えずにテーマを入れ替えられます。

## CSSカスタムプロパティの適応
テーマを切り替えると、テーマシステムが`--rb-*`のカスタムプロパティを新しいカラーパレットとタイポグラフィのフォントに合わせて書き換えます。意味でトークンを参照するコンポーネント（`--rb-color-ink`など）は自動的に適応します。同じCSSカスタムプロパティ名がテーマごとに異なる値へ解決されるため、有効なテーマが変わってもコンポーネントを変更する必要はありません。

## 関連用語

- [[glossary/theme|Theme]]
- [[semantic-token|Semantic Token]]
- [[css-contract|CSS Contract]]
- [[glossary/typography|Typography]]

## さらに詳しく

- [Design Tokens](../framework/theme-system/tokens.ja.md)
