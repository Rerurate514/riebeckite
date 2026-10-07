# @riebeckite/plugin-wavedrom

` ```wavedrom ` コードブロックを [WaveDrom](https://wavedrom.com/) のタイミング図として表示するプラグインです。

[English](./README.md)

## 概要

`wavedrom()` は ` ```wavedrom `（および ` ```wavejson `）のコードブロックを `<figure>` に置き換え、正規化した WaveJSON を `data-wavedrom-spec` 属性に埋め込みます。図そのものはブラウザ側の `initWaveDrom` が `wavedrom` を動的 import して描画します。ビルドはマークアップだけを出力します。実行順は `order: -10` です。

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { wavedrom } from "@riebeckite/plugin-wavedrom";

export default defineConfig({
  // ...
  plugins: [
    wavedrom({
      skin: "default",
      caption: true,
    }),
  ],
});
```

## タイミング図を書く

本文は **厳密な JSON** の WaveJSON オブジェクトです。キーは必ず二重引用符で囲み、末尾のカンマやコメントは書けません。

````markdown
```wavedrom
{
  "signal": [
    { "name": "clk", "wave": "p......" },
    { "name": "bus", "wave": "x.34.5x", "data": "head body tail" },
    { "name": "wire", "wave": "0.1..0." }
  ]
}
```
````

WaveDrom の `head` / `config` / `foot` など、`signal`・`assign`・`reg` 以外のトップレベルキーもそのまま引き継がれます。

```wavedrom
{
  "head": { "text": "handshake" },
  "signal": [
    { "name": "req", "wave": "01..0" },
    { "name": "ack", "wave": "0.1.0" }
  ]
}
```

### キャプション

キャプションはコードブロックの `title` から取得します。

````markdown
```wavedrom title="読み出しサイクル"
{ "signal": [{ "name": "clk", "wave": "p..." }] }
```
````

JSON のトップレベル `"caption"` キーでも指定できます。このキーは図を描画する前に取り除かれるため、WaveDrom には渡りません。

````markdown
```wavedrom
{
  "caption": "読み出しサイクル",
  "signal": [{ "name": "clk", "wave": "p..." }]
}
```
````

## 出力

```html
<figure class="rb-wavedrom" data-wavedrom="pending" data-wavedrom-spec="{&quot;signal&quot;:[...]}" data-wavedrom-skin="default">
  <figcaption id="rb-wavedrom-xxxx-caption" class="rb-wavedrom__caption">読み出しサイクル</figcaption>
  <div class="rb-wavedrom__canvas" data-wavedrom-canvas="true" role="img" aria-labelledby="rb-wavedrom-xxxx-caption"></div>
  <details class="rb-wavedrom__fallback">
    <summary>WaveJSON source</summary>
    <pre><code>{ ... }</code></pre>
  </details>
</figure>
```

- `.rb-wavedrom` — 図全体のラッパー。`--rb-color-*` で配色を引き継ぎます
- `.rb-wavedrom__canvas` — WaveDrom が SVG を描画する領域。`data-wavedrom-canvas="true"`
- `.rb-wavedrom__caption` — キャプションがある場合の `<figcaption>`
- `.rb-wavedrom__fallback` — WaveJSON のソースを表示する `<details>`

`data-wavedrom` 属性は描画状態を表します。初期値は `pending`、成功時は `rendered`、失敗時は `error` になります。失敗時はフォールバックの `<details>` が開きます。

## オプション

| 項目 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `skin` | `"default" \| "narrow" \| "lowkey"` | `"default"` | ブラウザ側で使う WaveDrom スキン |
| `caption` | `boolean` | `true` | キャプションを `<figcaption>` として表示する |
| `fallback` | `boolean` | `true` | WaveJSON ソースを `<details>` に表示する |
| `className` | `string` | `"rb-wavedrom"` | figure に付ける基底クラス |

## 診断

本文が JSON として不正、オブジェクトでない、`signal` / `assign` / `reg` がない場合は、元のコードブロックをそのまま残し、`source: "@riebeckite/plugin-wavedrom"`、`ruleId: "invalid-config"` の診断を出します。

## クライアント側の描画

`wavedrom` はビルド時にはバンドルされません。サイトのクライアントバンドルが `initWaveDrom` を呼ぶ必要があり、`wavedrom()` が `createClientEntry` で結線します。`initWaveDrom` は `figure[data-wavedrom="pending"]` を探し、各 `data-wavedrom-spec` を `JSON.parse` して `wavedrom` を動的 import し、`WaveDrom.RenderWaveForm` で `<div class="rb-wavedrom__canvas">` に SVG を描画します。`data-wavedrom-skin` があれば対応するスキンを読み込みます。パース失敗や描画例外はその figure だけを `data-wavedrom="error"` にし、フォールバックを開きます。

## 制限

- 描画はクライアント専用です。JavaScript が無効な環境では SVG は生成されず、WaveJSON ソースだけが残ります
- E2E のビルドは出力マークアップだけを検査します。実際の描画にはブラウザが必要です
- 本文は厳密な JSON である必要があります。WaveDrom エディタが受け付ける JSON5 形式（引用符なしキー、シングルクォート、コメント）は受理しません
- WaveJSON は HTML 属性に直接埋め込まれるため、巨大な図は避けてください
- 認識するのは `wavedrom` と `wavejson` という info string だけです。他の言語には影響しません

## 関連資料

- [プラグインシステム](../../../docs/docs/reference/plugin-api.ja.md)

