---
date: 2026-10-14
title: userCss
sidebar:
  hidden: true
---
# userCss

userCssはtheme CSSのあとに読み込まれる追加のスタイルシートです。Themeをforkせずに、サイト作者が外観を最終調整できます。

## カスケードの位置
読み込み順は、framework CSS → Plugin CSS → theme CSS → configのtokenインラインスタイル→ userCssです。userCssは最後の上書きとなり、サイト固有の小さな調整に向きます。

```ts
export default defineConfig({
  theme: defaultTheme({
    userCss: ["/extensions/custom.css"],
  }),
});
```

## userCssファイルの設定
`userCss`は`defineConfig`でスタイルシートのパスの配列として設定します。例：`userCss: ["/extensions/custom.css"]`。読み込まれたスタイルシートはページのヘッダーに順番に追加され、最後に記述されたスタイルシートが最優先のspecificityを持ちます。

## 使用例
- 記事の余白をわずかに調整する
- 特定の要素のテキストサイズを変更する
- サイト固有の装飾を追加する
調整はuserCssで行い、変更が大きくなったらThemeに移してください。

## 関連用語
- [[glossary/theme|Theme]]
- [[presentation-layer|Presentation Layer]]
- [[glossary/color-mode|Color Mode]]

## さらに詳しく
- [CSS](../framework/theme-system/css.ja.md)