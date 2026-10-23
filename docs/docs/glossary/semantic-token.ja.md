---
date: 2026-10-14
title: Semantic Token
sidebar:
  hidden: true
---
# Semantic Token

Semantic Tokenは、本文の色、アクセント、境界といった意味で参照するDesign Tokenです。コンポーネントを変えずにThemeを入れ替えられます。

## Tokenの分類
Semantic Tokenは色、タイポグラフィ、レイアウトのグループに分かれます。各グループには意味に基づく名前があり、CSSカスタムプロパティに対応します。
色グループ: paper, ink, muted, accent, border, borderStrong, surface, surfaceHover, overlay, danger, success, codeBackground。
タイポグラフィグループ: bodyFont, headingFont, monoFont。
レイアウトグループ: pageMaxWidth, articleMaxWidth, sidebarWidth, contentGap。

```mermaid
flowchart LR
  UI[コンポーネント / プラグイン]
  Token[--rb-color-ink]
  ThemeA[Theme A / #202020]
  ThemeB[Theme B / #d8dee9]
  UI --> Token
  ThemeA --> Token
  ThemeB --> Token
```

## Themeからの独立
コンポーネントがTheme固有の色名を参照すると、Themeを入れ替えられなくなります。
Semantic Tokenは、`--rb-color-ink`のようなTokenがあらゆるThemeのinkの値へ解決されるようにして、この問題を解決します。

## Plugin-Specific Meaning Tokens (--rr-)
Plugin固有の意味トークンは`--rr-`接頭辞を使い、存在すれば`--rb-`にフォールバックします。これにより、PluginはThemeからの独立性を保ちながら、独自のトークン名前空間を持てます。
```css
--rr-example-background: var(--rb-color-surface);
```

## トークンのCSS変数名
トークン名をkebab-case CSS変数に変換します：`borderStrong`は`--rb-color-border-strong`、`bodyFont`は`--rb-font-body`、その他同様です。CSSカスタムプロパティ名は`--rb-<group>-<token>`のパターンに従えます。groupは`color`、`typography`、`layout`のいずれかです。

## 関連用語
- [[design-token|Design Token]]
- [[glossary/color-mode|Color Mode]]
- [[glossary/typography|Typography]]
- [[glossary/theme|Theme]]

## さらに詳しく
- [Design Tokens](../framework/theme-system/tokens.ja.md)