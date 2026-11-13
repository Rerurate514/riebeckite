---
date: 2026-10-14
title: タイポグラフィ（Typography）
sidebar.hidden: true
---
# タイポグラフィ（Typography）

タイポグラフィは、フォントファミリ、サイズ、行間といったテーマの組版設定です。テーマが `typography` 設定を宣言し、セマンティックなフォントトークンへ対応付けます。Core の型でも `ThemeOptions` のフィールドでもありません。

## テーマ設定

```ts
settings: defineThemeSettings({
  typography: {
    type: "select",
    label: "Typography",
    default: "system",
    options: [
      { value: "system", label: "System" },
      { value: "serif", label: "Serif" },
      { value: "sans", label: "Sans" },
    ],
  },
}),
```

解決された値は、テーマルート（`.rb-theme-root` または `<html>`）の `data-rb-setting-typography` 属性として反映されます。

## CSS への対応付け

```css
:is(:root, .rb-theme-root)[data-rb-setting-typography="serif"] {
  --rb-font-body: Georgia, serif;
  --rb-font-heading: "Libre Baskerville", serif;
  --rb-font-mono: "Source Code Pro", monospace;
}
```

テーマのプリセットから同じ設定を指定することもできます。`data-rb-layout` と組み合わせると、タイポグラフィと記事レイアウトで記事全体の見せ方が決まります。

## 関連用語
- [[glossary/theme|Theme]]
- [[design-token|Design Token]]
- [[semantic-token|Semantic Token]]
- [[article-layout|Article Layout]]

## さらに詳しく
- [Typography](../framework/theme-system/typography.ja.md)
