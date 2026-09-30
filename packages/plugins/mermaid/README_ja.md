# @riebeckite/plugin-mermaid

`mermaid` コードブロックを SVG の図として表示するプラグインです。既定ではビルド時に描画し、描画できなかった図だけをブラウザ側で再試行します。

[English](./README.md)

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { mermaid } from "@riebeckite/plugin-mermaid";

export default defineConfig({
  // ...
  plugins: [
    mermaid({
      render: "build",
      theme: { light: "default", dark: "dark" },
    }),
  ],
});
```

このプラグインは `order: -10` で実行されます。Mermaid のコードブロックを先に処理したい場合に適した順序です。

## どのように描画されるか

` ```mermaid ` のコードブロックは `figure.rr-mermaid` に置き換わります。図のタイトルはコードブロックの title、またはソース内の `%% caption: ...` 行から取得します。図には代替テキスト相当の `role="img"` を付け、必要に応じて元の記法を折りたたみ表示します。

`render: "build"` または `"both"` では、Puppeteer が起動するヘッドレス Chromium 上で Mermaid を実行し、静的な SVG を生成します。簡易な DOM 実装や寸法の推測には頼らないため、ブラウザと同じレイアウトエンジンで図を作れます。Mermaid は `securityLevel: "strict"` で実行されます。

構文エラーは `invalid-diagram`、描画環境の問題は `renderer-error` として区別して診断します。ビルドで SVG を作れなかった図には `data-mermaid="pending"` が付き、クライアント側が描画を引き継ぎます。

## クライアント側の再試行

`initMermaidDiagrams` は保留中の図だけを描画します。Mermaid のインスタンスがなければ jsDelivr から Mermaid 11 を読み込みます。描画に失敗した場合は `data-mermaid="error"` となり、CSS のプレースホルダー表示に切り替わります。

明暗別のテーマを指定した場合は、`html[data-theme]` を優先し、なければ OS の配色設定に従います。

## オプション

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| `render` | `"build"` | `"build"`、`"client"`、`"both"` のいずれで描画するか |
| `theme` | `{ light: "default", dark: "dark" }` | Mermaid のテーマ名、または明暗別のテーマ |
| `caption` | `true` | タイトルまたは `%% caption:` をキャプションとして表示する |
| `fallback` | `true` | 元の Mermaid 記法を `<details>` に残す |

`"client"` はビルド時の描画を行いません。`"both"` は後方互換の値で、現在は `"build"` と同じくビルドを優先し、失敗時だけクライアント側へ切り替えます。

## 主なエクスポート

- `mermaid(options?)`: プラグインを作成する
- `initMermaidDiagrams`: クライアント側の描画を初期化する
- 型: `MermaidOptions`、`MermaidClientOptions`、`MermaidRenderMode`、`MermaidTheme`

## 関連資料

- [プラグインシステム](../../../docs/ja/reference/plugin-api.md)
