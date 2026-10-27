# @riebeckite/theme-editorial

<!-- Generated from docs/docs/themes/editorial.ja.md. Edit the canonical documentation in docs/docs/themes and run `pnpm docs:sync`. -->

アイボリーの紙面、書籍らしいセリフ体、バーガンディの編集記号で構成する長文エッセイ向けテーマです。

[English](./README.md)

## 使い方

```ts
import { editorialTheme } from "@riebeckite/theme-editorial";

export default defineConfig({
  theme: editorialTheme({ colorMode: "system" }),
});
```

## デザイン

- 装飾を添えたタイトルページ、控えめなメタデータ、表示向けのセリフ体で、マークアップを増やさず雑誌のような導入を作ります。
- 罫線による区切り、イタリックの小見出し、中央配置のプルクオートで、エッセイに印刷物らしいリズムを与えます。
- 埋め込み SVG の装飾と短いタイトル表示アニメーションを使い、縮小モーション設定にも対応します。

## 設定とトークン

`editorialTheme(options?)` は `name` 以外の `ThemeConfig`、`colorMode`、`typography`、`articleLayout`、`tokens`、`userCss` を受け取ります。共通の色、フォント、余白、レイアウトトークンは `tokens` で上書きできます。

## モードと互換性

ライト、明示ダーク、システムダークは同じトークンセットを公開します。キーボードフォーカス、縮小モーション、レスポンシブな文字、横スクロール表、Callout・Recent posts・Backlinks の安定した公開ルートに対応します。同梱フォントと実行時コードはありません。

## エクスポート

- `editorialTheme(options?)`
- `EditorialThemeOptions`
- `@riebeckite/theme-editorial/style.css`
