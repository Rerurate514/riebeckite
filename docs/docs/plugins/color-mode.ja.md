---
date: 2026-10-08
title: color-mode
---
# color-mode

Riebeckite サイト向けのライト / ダーク / システム連動のカラーモード切替プラグインです。実行時に `<html>` の `data-theme` 属性へ書き込みます。これはテーマが配色を選ぶのに使う属性そのものなので、組み込みの全テーマで動作し、テーマ側に JavaScript は一切必要ありません。

[English](./color-mode.md)

## 概要

[テーマシステム](../reference/theme-api.ja.md) のテーマは、次の 3 つの CSS 状態から配色を決めます。

- `:root`：ライト
- `:root[data-theme="dark"]`：ダーク
- `@media (prefers-color-scheme: dark) { :root:not([data-theme]) }`：OS に追随（system）

このプラグインは、その取り決めを切り替えるだけの薄い実行時スイッチで、次の 3 つを提供します。

- `ColorModeScript`：`<head>` に置く 1 行のインラインスクリプトです。**最初の描画の前に**保存済みのモードを適用し、テーマのちらつき（FOUC）を防ぎます。
- `ColorModeToggle`：ライト / ダーク / システムを選ぶセグメントコントロール。
- `initColorMode`：クライアントエントリー。ボタンの結線、`localStorage` への保存、ドキュメントの状態同期を行います。

`colorModePlugin()` はスタイルシートとクライアントエントリーの登録だけを行います。UI は、サイトシェルで描画する 2 つのコンポーネントが担います。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { colorModePlugin } from "@riebeckite/plugin-color-mode";

export default defineConfig({
  // ...
  plugins: [colorModePlugin()],
});
```

`colorModePlugin()` は `style.css` をバンドルし、`initColorMode` をクライアントエントリとして宣言します。

### コンポーネントの描画

```tsx
import { ColorModeScript, ColorModeToggle } from "@riebeckite/plugin-color-mode";
import { ThemeRoot } from "@riebeckite/honox/ui";

// ...レンダラー内
return (
  <ThemeRoot theme={config.theme}>
    <head>
      <ColorModeScript />
      {/* スタイルシート, ... */}
    </head>
    <body>
      <header>
        <ColorModeToggle />
      </header>
      {children}
    </body>
  </ThemeRoot>
);
```

`<ColorModeScript />` は CSS が適用される前にモードが確定するよう、スタイルシートより先に `<head>` へ置いてください。`<ColorModeToggle />` はヘッダーやナビバーなど任意の場所に配置できます。

### 受け取る props

`ColorModeScript`

| Prop | 説明 |
| ---- | ---- |
| `storageKey` | 読み取り元の localStorage キー。既定値は `riebeckite-color-mode`。 |

`ColorModeToggle`

| Prop | 説明 |
| ---- | ---- |
| `storageKey` | 保存先の localStorage キー。既定値は `riebeckite-color-mode`。 |
| `modes` | 表示するモード（順序付き）。既定値は `["light", "dark", "system"]`。 |
| `labels` | モードごとの `aria-label` 上書き: `{ light?, dark?, system? }`。 |
| `label` | グループ名に使う文言。視覚的に隠した `<legend>` として描画されます。既定値は `"Color mode"`。 |

ストレージキーを変更する場合は、両コンポーネントで同じ値を指定してください。

## モードの決定方法

1. `ColorModeScript` が最初の描画時に保存値を適用します。値が有効なモード（`light` / `dark` / `system`）の場合のみ上書きし、それ以外はサーバーが出力した `data-theme`（テーマの `colorMode` 由来）をそのまま残します。
2. 読み込み時に `initColorMode` が同じ判定を行い、ボタンの `aria-pressed` を同期します。
3. ボタンを押すと選択を保存して即時に再適用します。`"system"` は `data-theme` 属性を**削除**し、OS の設定 CSS に委ねます。

テーマは表示のみを担当するため、SSR 時の `data-theme` はテーマの `colorMode` から生成されます。プラグインは訪問者が別のモードを選んだときだけ上書きします。

## CSS フック

| フック | 用途 |
| ---- | ---- |
| `rr-color-mode` | トグルのルートコンテナ。 |
| `rr-color-mode__button` | 個々のモードボタン。 |
| `rr-color-mode__icon` | インライン SVG アイコン。 |

スタイルシートは `--rb-color-*` トークンを使うため、アクティブなテーマに追従します。ルートは `display: none` で、`initColorMode`（またはインラインスクリプト）が `<html>` に `data-rb-color-mode="ready"` を付けるまで非表示です。JavaScript が無効なページではコントロールそのものが現れません。

テーマは `rr-color-mode` のルート要素に `--rr-color-mode-border-radius` を指定すると、
子要素を選択せずにコンテナとボタンで共有する角丸を変更できます。

## アクセシビリティ

- コンテナは `<fieldset>` で、グループ名は視覚的に隠した `<legend>` が提供します。文言は `label` プロップで指定します。
- 各ボタンは `type="button"` でモード名の `aria-label` を持ち、アクティブなボタンには実行時設定の `aria-pressed="true"` が付きます。
- アイコンは装飾（`aria-hidden`）。ラベルはボタンから提供されます。
- `prefers-reduced-motion` ではトランジションを無効化します。

## イベント

`initColorMode` は `document` 上で `CustomEvent` を発火します。

```ts
document.addEventListener("riebeckite:color-mode", (event) => {
  event.detail.mode; // "light" | "dark" | "system"
});
```

現時点で消費するものはありません。図の再描画などの連携のための拡張ポイントです。

## 制約

- 図関連プラグイン（`d2` / `mermaid` / `vega-lite`）は初期化時にしか `data-theme` を読みません。モード切替後、リロードまでは前の配色のままです。将来の再描画のためのフックが `riebeckite:color-mode` イベントです。
- インラインスクリプトは Content-Security-Policy の影響を受けます。`script-src` がインラインを禁止している場合は nonce や hash で許可してください。
- `localStorage` へのアクセスは `try/catch` で保護しています。ストレージが使えない環境でも、そのページでは切替が機能します（永続化のみされません）。
- 1 ページに複数のトグルを置く場合は、同じ `storageKey` を共有してください。

## エクスポート

- `colorModePlugin()`：プラグインファクトリ
- `ColorModeToggle`：切替コンポーネント
- `ColorModeScript`：描画前インラインスクリプトのコンポーネント
- `initColorMode`：ブラウザ初期化関数（`@riebeckite/plugin-color-mode/client` からもエクスポート）
- 定数: `COLOR_MODES` / `COLOR_MODE_STORAGE_KEY` / `COLOR_MODE_EVENT` ほか
- 型: `ColorMode`

## 関連

- [[theme-api|テーマシステム]]
- [`@riebeckite/plugin-ux`](./ux.ja.md)
