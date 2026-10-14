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

## ThemeRootのUIコンポーネント
フレームワークは`@riebeckite/honox/ui`から`ThemeRoot`というUIプリミティブを提供します。使用方法は以下の通りです。
```tsx
import { ThemeRoot } from "@riebeckite/honox/ui";
<ThemeRoot
  theme={config.theme}
  lang={c.get("htmlLanguage") ?? config.site.locale}
>
  {children}
</ThemeRoot>
```
`ThemeRoot`は以下の属性を持つ`<html>`要素をレンダリングします：`lang`、`data-theme-name`、`data-theme`、`data-typography`、`data-article-layout`。

## `<html>`の予約属性
枠組みによって予約されている属性`data-theme`、`data-theme-name`、`data-typography`、`data-article-layout`は、Themeの`attributes`によって上書きできません。カスタム`<html>`属性を追加するには、`themeRootAttributes`ヘルパーを直接使用してください。
```tsx
import { themeRootAttributes } from "@riebeckite/honox/ui";
<html
  lang={c.get("htmlLanguage") ?? config.site.locale}
  {...themeRootAttributes(config.theme)}
  data-custom-attr="..."
>
  ...
</html>
```

## 関連用語

- [[glossary/theme|Theme]]
- [[design-token|Design Token]]
- [[glossary/color-mode|Color Mode]]
- [[glossary/typography|Typography]]

## さらに詳しく

- [Theme Root](../framework/theme-system/theme-root.ja.md)
