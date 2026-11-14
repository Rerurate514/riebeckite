---
date: 2026-10-14
title: stylesheets（追加スタイルシート）
sidebar.hidden: true
---
# stylesheets（追加スタイルシート）

アプリケーションのスタイルシートの後に読み込まれる追加スタイルシートです。テーマをフォークせずに最終調整できます。レイヤー外の通常宣言はフレームワーク・プラグイン・テーマの通常宣言に勝ちますが、インライン設定トークン、`!important`、アニメーション、トランジションには勝ちません。

## カスケードの位置
通常宣言のレイヤー順は `base` → `components` → `utilities` → `rb-plugins` → `rb-theme` → レイヤー外のサイト CSS です。`stylesheets` はレイヤー外のサイト CSS であり、サイト固有の小さな最終調整に向きます。

```ts
export default defineConfig({
  theme: defaultTheme({
    stylesheets: ["/extensions/custom.css"],
  }),
});
```

## stylesheetsファイルの設定
`stylesheets` は `defineConfig` でスタイルシートのパスの配列として設定します（例：`stylesheets: ["/extensions/custom.css"]`）。読み込まれたスタイルシートは指定順にページのヘッダーへ追加され、他の条件が同じなら後のスタイルシートがソース順で勝ちます。

## 使用例
- 記事の余白を少し調整する
- 特定の要素のテキストサイズを変える
- サイト固有の装飾を追加する

調整には stylesheets を使い、変更が大きくなったらテーマへ移してください。

## 関連用語
- [[glossary/theme|Theme]]
- [[presentation-layer|Presentation Layer]]
- [[glossary/color-mode|Color Mode]]

## さらに詳しく
- [CSS](../framework/theme-system/css.ja.md)
