<!-- Generated from packages/plugins/color-mode/README_ja.md. Do not edit this page directly; edit the package README and run `pnpm docs:sync`. -->

# color-mode

Riebeckite サイト向けのライト / ダーク / システム連動のカラーモード切替プラグインです。実行時に `<html>` の `data-theme` 属性へ書き込みます。これはテーマが配色を選ぶのに使う属性そのものなので、組み込みの全テーマで動作し、テーマ側に JavaScript は一切必要ありません。

[English](./color-mode.md)

## 概要

[theme-system.md](../reference/theme-api.ja.md) テーマの配色は、次の 3 つの CSS 状態で決まります。

- `:root` — ライト
- `:root[data-theme="dark"]` — ダーク
- `@media (prefers-color-scheme: dark) { :root:not([data-theme]) }` — OS に追随（system）

プラグインは、この 3 つの CSS 状態を切り替えるだけの薄い実行時スイッチで、次の 3 つを提供します。

- `ColorModeScript` — `<head>` に置く 1 行のインラインスクリプト。**最初の描画の前に**保存済みモードを適用し、テーマのちらつき（FOUC）を防ぎます。
- `ColorModeToggle` — ライト / ダーク / システムのセグメント型コントロール。
- `initColorMode` — クライアントエントリ。ボタンの結線、`localStorage` への保存、ドキュメントの状態同期を行います。

`colorModePlugin()` はスタイルシートとクライアントエントリの登録だけを行います。UI はサイトシェルで描画する 2 つのコンポーネントから届きます。

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

### Props

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
| `label` | グループの先頭に置く可視非表示の `<legend>` として使われます。既定値は `"Color mode"`。 |

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

## アクセシビリティ

- コンテナは `<fieldset>` で、グループ名は可視非表示の `<legend>`（`label` props）が提供します。
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

## Exports

- `colorModePlugin()` — プラグインファクトリ
- `ColorModeToggle` — 切替コンポーネント
- `ColorModeScript` — 描画前インラインスクリプトのコンポーネント
- `initColorMode` — ブラウザ初期化関数（`@riebeckite/plugin-color-mode/client` からも export）
- 定数: `COLOR_MODES` / `COLOR_MODE_STORAGE_KEY` / `COLOR_MODE_EVENT` ほか
- 型: `ColorMode`

## 関連

- [テーマシステム](../reference/theme-api.ja.md)
- [`@riebeckite/plugin-ux`](./ux.ja.md)
