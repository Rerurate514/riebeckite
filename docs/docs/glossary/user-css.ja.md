---
date: 2026-10-14
title: stylesheets（追加スタイルシート）
sidebar:
  hidden: true
---
# stylesheets（追加スタイルシート）

CSSカスケードで最後に読み込まれる追加スタイルシートで、テーマをフォークせずに、サイト作者がテーマの外観を最終調整できます。stylesheetsはテーマCSS、プラグインCSS、設定のトークンスタイルに優先します。

## カスケードの位置
読み込み順は、フレームワークCSS → プラグインCSS → テーマCSS → 設定のトークンインラインスタイル → stylesheets です。stylesheetsは最後の上書きで、サイト固有の小さな調整に向きます。

```ts
export default defineConfig({
  theme: defaultTheme({
    stylesheets: ["/extensions/custom.css"],
  }),
});
```

## stylesheetsファイルの設定
`stylesheets` は `defineConfig` でスタイルシートのパスの配列として設定します（例：`stylesheets: ["/extensions/custom.css"]`）。読み込まれたスタイルシートは指定順にページのヘッダーへ追加され、最後のスタイルシートが最も高い優先度を持ちます。

## 使用例
- 記事の余白を少し調整する
- 特定の要素のテキストサイズを変える
- サイト固有の装飾を追加する

調整にはstylesheetsを使い、変更が大きくなったらテーマへ移してください。

## 関連用語
- [[glossary/theme|Theme]]
- [[presentation-layer|Presentation Layer]]
- [[glossary/color-mode|Color Mode]]

## さらに詳しく
- [CSS](../framework/theme-system/css.ja.md)
