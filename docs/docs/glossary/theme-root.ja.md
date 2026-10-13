---
title: Theme Root
sidebar:
  hidden: true
---

# Theme Root

Theme Rootのセレクタ（`[data-theme-root]`または`<html>`）は、Tokenと属性のルールをページ全体に適用します。Color ModeとTypographyの属性をここへ付けると、カスケードがすべての要素に届きます。

## セレクタ

すべてのThemeのルールは、Themeの識別名にスコープされます。

```css
:is(:root, .rb-theme-root)[data-theme-name="<name>"] { /* light */ }
:is(:root, .rb-theme-root)[data-theme-name="<name>"][data-theme="dark"] { /* dark */ }
```

## data属性

Theme Rootは`<html>`に次の属性を付けます。

- `data-theme-name`: Themeの識別名（例: "riebeckite"、"minimal"）
- `data-theme`: Color Modeの状態（"light" / "dark"。`system`の場合は省略）
- `data-typography`: Typographyのプリセット値
- `data-article-layout`: Article Layoutのプリセット値

## 関連用語

- [[glossary/theme|Theme]]
- [[design-token|Design Token]]
- [[glossary/color-mode|Color Mode]]
- [[glossary/typography|Typography]]

## さらに詳しく

- [Theme Root](../framework/theme-system/theme-root.ja.md)
