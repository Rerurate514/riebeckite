# @riebeckite/plugin-d2

` ```d2 ` コードブロックを SVG の図として表示するプラグインです。既定ではビルド時に描画し、描画できなかった図だけをブラウザ側で再試行します。

[English](./README.md)

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { d2 } from "@riebeckite/plugin-d2";

export default defineConfig({
  // ...
  plugins: [
    d2({
      render: "build",
      theme: { light: 0, dark: 1 },
      layout: "dagre",
    }),
  ],
});
```

このプラグインは `order: -10` で実行されます。

## 記法

````markdown
```d2 title="リクエストの流れ"
client -> server: request
server -> database: query
```
````

キャプションはコードブロックの先頭行にも書けます。D2 は `#` をコメントとして扱うため、先頭の `# caption: ...` 行をキャプションとして取り込み、描画前に取り除きます。

````markdown
```d2
# caption: リクエストの流れ
client -> server: request
```
````

## どのように描画されるか

### ビルド時

` ```d2 ` のコードブロックは `figure.rb-d2` に置き換わります。

- `figcaption.rb-d2__caption`: コードブロックの title、または `# caption:` 行
- `div.rb-d2__canvas`: 図本体（`role="img"`、キャプションがある場合はそれをラベルに使用）
- `details.rb-d2__fallback`: 元の D2 記法を折りたたんで表示

`render: "build"` または `"both"` では、D2.js の WebAssembly 版（`@d2lang/d2`）を Node 上で直接実行して静的な SVG を生成します。ブラウザ、ネットワーク接続、D2 本体のインストールはいずれも不要です。

生成される figure には常に `data-d2`、`data-d2-source`、`data-d2-layout` が付きます。`data-d2` は静的 SVG があれば `rendered`、クライアント側の描画に委ねる場合は `pending` になります。

構文エラーは `invalid-diagram`、描画環境の問題は `renderer-error` として区別して診断します。

### クライアント側

`initD2Diagrams` は保留中の図だけを描画します。D2.js がなければ jsDelivr から ESM として読み込みます。描画に失敗した場合は `data-d2="error"` となり、CSS のプレースホルダー表示に切り替わります。

明暗別のテーマを指定した場合は、`html[data-theme]` を優先し、なければ OS の配色設定に従います。

## オプション

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| `render` | `"build"` | `"build"`、`"client"`、`"both"` のいずれで描画するか |
| `theme` | `{ light: 0, dark: 1 }` | D2 のテーマ ID、または明暗別のテーマ ID |
| `layout` | `"dagre"` | D2 のレイアウトエンジン（`"dagre"` または `"elk"`） |
| `caption` | `true` | タイトルまたは `# caption:` をキャプションとして表示する |
| `fallback` | `true` | 元の D2 記法を `<details>` に残す |
| `className` | `"rb-d2"` | figure に付ける基準クラス |

`"client"` はビルド時の描画を行いません。`"both"` は後方互換の値で、現在は `"build"` と同じくビルドを優先し、失敗時だけクライアント側へ切り替えます。

## オフラインでの利用

ビルド時の描画は完全にオフラインです。`@d2lang/d2` が同梱する WebAssembly を `node_modules` から読み込むだけで、外部通信は発生しません。クライアント側の描画（`render: "client"` またはビルド失敗時）は jsDelivr から D2.js を取得します。外部通信を避けたい場合は `moduleUrl` に自前でホストしたモジュールを指定してください。

## 出力のフック

- `globalThis.d2` に読み込み済みの D2.js モジュールを設定すると、CDN からの読み込みを省略できます
- `initD2Diagrams()` を直接呼ぶ場合は `api` と `moduleUrl` を渡せます

## 主なエクスポート

- `d2(options?)`: プラグインを作成する（`d2Plugin` は別名）
- `initD2Diagrams`: クライアント側の描画を初期化する
- 型: `D2Options`、`D2ClientOptions`、`D2RenderMode`、`D2Layout`、`D2Theme`、`D2ModuleApi`

## 制限

- 図ごとに新しい D2 ワーカーを起動するため、大量の図を含むビルドでは WASM の起動コストが繰り返し発生します
- `layout: "elk"` は D2 の ELK エンジンを使うため `dagre` より遅くなります
- マルチボードやアニメーション付きの出力はこのプラグインでは設定できません
- レンダラーには `@d2lang/d2`（MPL-2.0）を使用しています。`@terrastruct/d2` はその後方互換パッケージです

## 関連資料

- [プラグインシステム](../../../docs/ja/plugin-system.md)
