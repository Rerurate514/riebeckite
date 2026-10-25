# @riebeckite/theme-technical

<!-- Generated from docs/docs/themes/technical.ja.md. Edit the canonical documentation in docs/docs/themes and run `pnpm docs:sync`. -->

ニュートラルな面、コンパクトなサンセリフ体、青い技術的な手がかりで構成する高密度なドキュメント向けテーマです。

[English](./README.md)

## 使い方

```ts
import { technicalTheme } from "@riebeckite/theme-technical";

export default defineConfig({
  theme: technicalTheme({ colorMode: "system" }),
});
```

## デザイン

- 広いページ幅、抑えた記事幅、小さなナビゲーション文字で参照情報を走査しやすくします。
- 強い記事罫線、青い `h3` ラベル、等幅のメタデータ、直角の表セルで、装飾的な面に頼らず概念を分けます。
- Table of contents、Code、Code tabs、Callout、Query は安定した公開ルートと共通の罫線で扱います。

## 設定とトークン

`technicalTheme(options?)` は `name` 以外の `ThemeConfig`、`colorMode`、`typography`、`articleLayout`、`tokens`、`userCss` を受け取ります。共通のセマンティックな色、フォント、余白、レイアウトトークンは `tokens` で上書きできます。

## モードと互換性

ライト、明示ダーク、システムダークでは同じセマンティックな役割を定義します。キーボードフォーカス、レスポンシブな文字、表の横スクロール、縮小モーションに対応します。システムフォントだけを使い、プラグイン内部のセレクタは扱いません。

## エクスポート

- `technicalTheme(options?)`
- `TechnicalThemeOptions`
- `@riebeckite/theme-technical/style.css`
