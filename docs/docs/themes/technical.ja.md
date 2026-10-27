---
date: 2026-10-25
title: Technical
---
# Technical

高密度な参照情報を、体系的でコンパクト、かつ走査しやすい計測パネルとして見せるドキュメント向けテーマです。

[English](./technical.md)

## 使い方

```ts
import { technicalTheme } from "@riebeckite/theme-technical";

export default defineConfig({
  theme: technicalTheme({ colorMode: "system" }),
});
```

## デザイン

- グリッドを敷いたタイトルパネルと回路モチーフにより、本文に入る前からページ構造を見せます。
- 連番付きのセクション、等幅の見出し、信号マーカー、精密な罫線で、参照情報の概念をひと目で分けます。
- Code とプラグインの面も計測パネルの形状にそろえ、タイトルの信号アニメーションは一度だけ動作し、縮小モーション設定にも対応します。

## 設定とトークン

`technicalTheme(options?)` は `name` 以外の `ThemeConfig`、`colorMode`、`typography`、`articleLayout`、`tokens`、`userCss` を受け取ります。共通のセマンティックな色、フォント、余白、レイアウトトークンは `tokens` で上書きできます。

## モードと互換性

ライト、明示ダーク、システムダークでは同じセマンティックな役割を定義します。キーボードフォーカス、レスポンシブな文字、表の横スクロール、縮小モーションに対応します。システムフォントだけを使い、プラグイン内部のセレクタは扱いません。

## エクスポート

- `technicalTheme(options?)`
- `TechnicalThemeOptions`
- `@riebeckite/theme-technical/style.css`
