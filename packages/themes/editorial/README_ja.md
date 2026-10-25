# @riebeckite/theme-editorial

<!-- Generated from docs/docs/themes/editorial.ja.md. Edit the canonical documentation in docs/docs/themes and run `pnpm docs:sync`. -->

アイボリーの紙面、濃いセリフ体、バーガンディの操作状態で構成する長文ブログ向けテーマです。

[English](./README.md)

## 使い方

```ts
import { editorialTheme } from "@riebeckite/theme-editorial";

export default defineConfig({
  theme: editorialTheme({ colorMode: "system" }),
});
```

## デザイン

- 余白を取った中央配置の記事タイトルで、出版物らしい階層を作ります。
- 長文向けのセリフ本文、表示用の見出し、罫線のプルクオートでリズムを作り、影・グラデーション・カードグリッドは使いません。
- メタデータとサイトのクロームはコンパクトなサンセリフにし、本文より控えめにします。

## 設定とトークン

`editorialTheme(options?)` は `name` 以外の `ThemeConfig`、`colorMode`、`typography`、`articleLayout`、`tokens`、`userCss` を受け取ります。共通の色、フォント、余白、レイアウトトークンは `tokens` で上書きできます。

## モードと互換性

ライト、明示ダーク、システムダークは同じトークンセットを公開します。キーボードフォーカス、縮小モーション、レスポンシブな文字、横スクロール表、Callout・Recent posts・Backlinks の安定した公開ルートに対応します。同梱フォントと実行時コードはありません。

## エクスポート

- `editorialTheme(options?)`
- `EditorialThemeOptions`
- `@riebeckite/theme-editorial/style.css`
