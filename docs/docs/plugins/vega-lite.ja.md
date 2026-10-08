# Vega-Lite

` ```vega-lite ` コードブロックを Vega-Lite のチャートとして表示するプラグインです。チャートはブラウザ側で描画し、Vega ランタイムは必要になったときだけ動的に読み込みます。

[English](./vega-lite.md)

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { vegaLite } from "@riebeckite/plugin-vega-lite";

export default defineConfig({
  // ...
  plugins: [
    vegaLite({
      caption: true,
      theme: "light",
      renderer: "canvas",
    }),
  ],
});
```

このプラグインは `order: -10` で実行されます。

## 記法

コードブロックの本文に Vega-Lite の仕様を JSON で書きます。`vega-lite` に加えて `vega` も受け付けます。

````markdown
```vega-lite
{
  "title": "売上高",
  "data": {
    "values": [
      { "category": "A", "value": 28 },
      { "category": "B", "value": 55 }
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": { "field": "category", "type": "nominal" },
    "y": { "field": "value", "type": "quantitative" }
  }
}
```
````

キャプションにはコードブロックの `title`、なければ仕様の `title` を使います。

## どのように描画されるか

` ```vega-lite ` のコードブロックは `figure.rb-vega-lite` に置き換わります。

- `figure.rb-vega-lite`: `data-vega-lite="pending"` と `data-vega-lite-spec`（JSON をエスケープしたもの）を持ちます
- `div.rb-vega-lite__canvas`: チャートを描画する領域（`role="img"`）
- `figcaption.rb-vega-lite__caption`: キャプション（既定で有効）
- `details.rb-vega-lite__fallback`: 元の仕様を折りたたんで表示

`initVegaLite` は `[data-vega-lite]` を探し、`data-vega-lite-spec` を `JSON.parse` してから `vega`、`vega-lite`、`vega-embed` を動的インポートして `vega-embed` で描画します。描画に成功すると `data-vega-lite="rendered"` になります。

`vega-embed` の読み込み、仕様の `JSON.parse`、描画のいずれかが失敗した場合は例外を投げず、その figure の `details` を開いて元の仕様を見せます（`data-vega-lite="error"`）。

JSON を解析できないコードブロックは置き換えず、通常のコードブロックのまま残し、`@riebeckite/plugin-vega-lite` を `source` に持つ診断を出します。

## オプション

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| `caption` | `true` | `title` をキャプションとして表示する |
| `actions` | `null` | `vega-embed` の操作メニューを表示する（`true` / `false` / `null`） |
| `theme` | `"light"` | 配色（`"light"`、`"dark"`、`"none"`） |
| `renderer` | `"canvas"` | Vega のレンダラー（`"canvas"` または `"svg"`） |
| `className` | `"rb-vega-lite"` | figure に付ける基準クラス |

`actions` が `null` のときは `vega-embed` の既定（操作メニューあり）に従います。`theme` が `"light"` または `"none"` のときは Vega 既定の明るい配色を使い、`"dark"` のときだけ `vega-embed` の `dark` テーマを適用します。

## クライアント側の描画

クライアントの初期化コードは静的なので、プラグインのオプションは受け取りません。`actions`、`theme`、`renderer` は figure の `data-vega-lite-*` 属性に埋め込まれ、`initVegaLite` がそこから読み取ります。

Vega ランタイムは `import()` で動的に読み込むため、JavaScript を無効にしていてもページは表示され、仕様はフォールバックの `details` から読めます。

## 出力のフック

- `figure[data-vega-lite]`: 状態（`pending` / `rendered` / `error`）
- `figure[data-vega-lite-spec]`: エスケープ済みの仕様 JSON
- `figure[data-vega-lite-theme]`、`figure[data-vega-lite-renderer]`、`figure[data-vega-lite-actions]`
- `[data-vega-lite-canvas]`: 描画先の要素
- `details.rb-vega-lite__fallback`: 元の仕様

## 主なエクスポート

- `vegaLite(options?)`: プラグインを作成する（`vegaLitePlugin` は別名）
- `initVegaLite`: クライアント側の描画を初期化する
- 型: `VegaLiteOptions`、`VegaLiteSpec`、`VegaLiteTheme`、`VegaLiteRenderer`

## 制限

- 描画はクライアント側のみです。ビルド時に SVG などは生成しないため、JavaScript が無効な環境ではチャートは表示されません（仕様の `details` は残ります）
- チャートごとに `vega`、`vega-lite`、`vega-embed` を読み込むため、多数のチャートを含むページでは転送量と描画コストが増えます
- Vega-Lite のすべての機能を検証しているわけではありません。複雑な仕様はブラウザ側のエラーとして扱われ、フォールバックが開きます
- `vega`、`vega-lite`、`vega-embed` は BSD-3-Clause ライセンスです

## 関連資料

- [プラグインシステム](../reference/plugin-api.ja.md)
