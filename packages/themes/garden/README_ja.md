# @riebeckite/theme-garden

<!-- Generated from docs/docs/themes/garden.ja.md. Edit the canonical documentation in docs/docs/themes and run `pnpm docs:sync`. -->

つながったノートを主役にする、暖かいデジタルガーデン向けテーマです。落ち着いた明朝体の読書リズム、オリーブ色の操作状態、カードではなく罫線による構造を使います。

[English](./README.md)

## 使い方

```ts
import { gardenTheme } from "@riebeckite/theme-garden";

export default defineConfig({
  theme: gardenTheme({ colorMode: "system" }),
});
```

## デザイン

- 暖色の紙面、緑のリンク、ゆとりのある明朝体でノートを読みやすくします。
- 葉と茎の SVG を記事ヘッダーと節見出しに添え、縮小モーション設定を尊重した短い生長アニメーションを使います。
- Backlinks、Local graph、Garden explorer、Callout は安定した公開ルートを通じて罫線で統一します。

## 設定とトークン

`gardenTheme(options?)` は `name` 以外の `ThemeConfig`、すなわち `colorMode`、`typography`、`articleLayout`、`tokens`、`userCss` を受け取ります。`tokens` で共通の `--rb-color-*`、`--rb-font-*`、レイアウトトークンを上書きできます。

## モードと互換性

ライト、明示ダーク、システムダークのすべてで同じセマンティックトークン契約を定義します。`colorMode: "system"` は `data-theme` がない限り `prefers-color-scheme` に従います。縮小モーション、狭い画面、キーボードフォーカス、横スクロール表に対応し、システムフォントと安定した `rb-*`／`rr-*` フックだけを使います。

## エクスポート

- `gardenTheme(options?)`
- `GardenThemeOptions`
- `@riebeckite/theme-garden/style.css`
