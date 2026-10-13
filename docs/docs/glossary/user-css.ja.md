---
title: userCss
sidebar:
  hidden: true
---

# userCss

theme CSS の後に読み込まれる追加のスタイルシートで、テーマをフォークせずにサイト作者が外観に最終調整を加えられます。userCss は theme CSS、plugin CSS、config トークンスタイルの上書きに勝ちます。

## カスケードの位置

読み込み順: framework CSS → plugin CSS → theme CSS → config トークン内部スタイル → userCss
userCss は最終的な上書きとなり、小規模なサイト特有の調整に最適です。

```ts
export default defineConfig({
  theme: defaultTheme({
    userCss: ["/extensions/custom.css"],
  }),
});
```

## 使用例

記事の余白をわずかに調整
特定の要素のテキストサイズを変更
サイト特有の装飾を追加
調整には userCss を使用し、変更が大きくなったらテーマに再構成します。

## 関連用語

- [[glossary/theme|Theme]]
- [[presentation-layer|プレゼンテーション層]]
- [[glossary/color-mode|色調モード]]

## さらに詳しく

- [CSS](../framework/theme-system/css.ja.md)
