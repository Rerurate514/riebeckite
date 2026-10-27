# @riebeckite/theme-folio

<!-- Generated from docs/docs/themes/folio.ja.md. Edit the canonical documentation in docs/docs/themes and run `pnpm docs:sync`. -->

直接的なサンセリフ体、非対称のタイトル罫線、抑えた朱色のアクセントで構成する高コントラストなポートフォリオ向けテーマです。

[English](./README.md)

## 使い方

```ts
import { folioTheme } from "@riebeckite/theme-folio";

export default defineConfig({
  theme: folioTheme({ colorMode: "system" }),
});
```

## デザイン

- 大きく詰めたタイトル、左のアクセント罫線、SVG のトリミングマークで、プロジェクトページにポスターのような明快な階層を与えます。
- 広い記事幅は、コンテンツをカードグリッドにせずプロジェクト説明とメディアを扱いやすくします。
- Media、Lightbox、Recent posts、Card link は安定した公開プラグインルートを通じて上罫線で構造化し、枠とカードのホバーには縮小モーション設定を尊重した短い動きを与えます。

## 設定とトークン

`folioTheme(options?)` は `name` 以外の `ThemeConfig`、`colorMode`、`typography`、`articleLayout`、`tokens`、`userCss` を受け取ります。共通のセマンティックな色、書体、余白、レイアウトは `tokens` で上書きできます。

## モードと互換性

ライト、明示ダーク、システムダークのトークン契約は一致します。視認できるフォーカス、レスポンシブな文字、縮小モーション、表の横スクロールに対応します。配布物は CSS のみで、システムフォントを使います。

## エクスポート

- `folioTheme(options?)`
- `FolioThemeOptions`
- `@riebeckite/theme-folio/style.css`
