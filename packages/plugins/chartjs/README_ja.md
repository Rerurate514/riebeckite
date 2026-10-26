# @riebeckite/plugin-chartjs

<!-- Generated from docs/docs/plugins/chartjs.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

` ```chart ` コードブロックを、レスポンシブな [Chart.js](https://www.chartjs.org/) のグラフとして表示するプラグインです。

[English](./README.md)

## 概要

`chartjs()` は ` ```chart ` のコードブロックを `<figure>` に置き換え、Chart.js の設定を JSON として埋め込みます。グラフそのものはブラウザ側の `initChartJs` が `chart.js/auto` を動的に import して描画します。ビルドはマークアップだけを出力します。実行順は `order: -10` です。

## 設定

```ts
import { defineConfig } from "@riebeckite/core";
import { chartjs } from "@riebeckite/plugin-chartjs";

export default defineConfig({
  // ...
  plugins: [
    chartjs({
      responsive: true,
      caption: true,
    }),
  ],
});
```

## グラフを書く

`chart` ブロックの本文は JSON オブジェクトです。Chart.js の完全な設定をそのまま書けます。

````markdown
```chart
{
  "type": "bar",
  "data": {
    "labels": ["月", "火", "水"],
    "datasets": [{ "label": "訪問数", "data": [12, 19, 8] }]
  },
  "options": { "plugins": { "legend": { "display": false } } }
}
```
````

`labels` と `datasets` をトップレベルに置く省略形も使えます。この場合は `data` に正規化されます。

````markdown
```chart
{
  "type": "line",
  "labels": ["月", "火", "水"],
  "datasets": [{ "label": "訪問数", "data": [12, 19, 8] }]
}
```
````

`options` や `plugins` など、それ以外のトップレベルのキーは正規化後の設定にそのまま残ります。

### キャプション

キャプションはコードブロックの `title` から取得します。

````markdown
```chart title="週間の訪問数"
{ "type": "bar", "labels": ["月"], "datasets": [{ "data": [1] }] }
```
````

JSON の `"caption"` キーでも指定できます。このキーは設定をシリアライズする前に取り除かれるため、Chart.js には渡りません。

````markdown
```chart
{
  "type": "bar",
  "caption": "週間の訪問数",
  "labels": ["月"],
  "datasets": [{ "data": [1] }]
}
```
````

## 実行例

~~~chart
{
  "type": "bar",
  "data": {
    "labels": ["Mon", "Tue", "Wed"],
    "datasets": [{ "label": "Visits", "data": [12, 19, 8] }]
  }
}
~~~

## 出力

````html
<figure class="rb-chartjs" data-diagram="chartjs" data-diagram-status="pending" data-diagram-id="rb-chartjs-…" data-chartjs-marker="RIEBECKITE_EXTERNAL_CHARTJS_MARKER">
  <figcaption class="rb-chartjs__caption" data-diagram-caption="true">週間の訪問数</figcaption>
  <canvas
    class="rb-chartjs__canvas"
    data-diagram-content="true"
    data-diagram-config="{&quot;type&quot;:&quot;bar&quot;,...}"
    role="img"
    aria-labelledby="rb-chartjs-…-caption"
  ></canvas>
  <details class="rb-chartjs__fallback" data-diagram-fallback="true">…</details>
</figure>
````

- `.rb-chartjs`：図全体のラッパー。`--rb-color-*` で配色を引き継ぎます
- `.rb-chartjs__canvas`：Chart.js が描画する `<canvas>`。`data-diagram-config` にエスケープ済みの JSON 設定が入ります
- `.rb-chartjs__caption`：キャプションがある場合の `<figcaption>`

## オプション

| 項目 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `responsive` | `boolean` | `true` | `options.responsive` を指定していないグラフに適用する既定値 |
| `caption` | `boolean` | `true` | キャプションを `<figcaption>` として表示する |
| `className` | `string` | `"rb-chartjs"` | `figure` 要素に付ける基底クラス |

## 診断

本文が JSON として不正、オブジェクトでない、`type` がない、`data` または `labels` / `datasets` がない場合は、元のコードブロックをそのまま残し、`source: "@riebeckite/plugin-chartjs"`、`ruleId: "invalid-config"` の診断を出します。

## クライアント側の描画

Chart.js はビルド時にはバンドルされません。サイトのクライアントバンドルは、図を描画するクライアントの共通ライフサイクルを通じて `initChartJs` を呼びます。`[data-diagram="chartjs"]` のうち未描画の図を処理し、`chart.js/auto` を import します。ページを離れる際には各 Chart.js インスタンスを破棄します。失敗した図には `error` を設定し、ソースのフォールバックを開きます。

## 制限事項

- E2E のビルドは出力マークアップだけを検査します。実際の描画にはブラウザが必要です
- グラフ設定は HTML 属性に直接埋め込まれるため、データセットはあまり大きくしないでください
- 認識するのは `chart` という info string だけです。他の言語には影響しません

## 関連資料

- [プラグインシステム](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
