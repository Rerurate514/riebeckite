# @riebeckite/plugin-graphviz

`dot` / `graphviz` コードブロックを Graphviz の SVG 図として表示するプラグインです。既定ではビルド時に描画します。

[English](./README.md)

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { graphviz } from "@riebeckite/plugin-graphviz";

export default defineConfig({
  // ...
  plugins: [
    graphviz({
      render: "build",
      engine: "dot",
    }),
  ],
});
```

````markdown
```dot
// caption: リクエストの流れ
digraph {
  rankdir="LR"
  client -> server [label="request"]
  server -> client [label="response"]
}
```
````

コードブロックの info 文字列は `dot` のほかに `graphviz` も受け付けます。

## どのように描画されるか

` ```dot ` のコードブロックは `figure.rb-graphviz` に置き換わります。内容は次のとおりです。

- `figcaption.rb-graphviz__caption` — コードブロックの title、またはソース内の `// caption: ...` 行から取得
- `div.rb-graphviz__canvas` — 図本体（`role="img"`、キャプションがあればそれを参照）
- `details.rb-graphviz__fallback` — 元の DOT 記法を折りたたみ表示

`render: "build"` または `"both"` では、ビルド時に [`@viz-js/viz`](https://github.com/mdaines/viz-js) の WebAssembly 版 Graphviz で静的な SVG を生成します。XML プロローグと DOCTYPE は HTML にインライン展開できるよう取り除きます。`@viz-js/viz` は Node 上で完全にオフラインで動作し、ビルドプロセスを正常終了させます（ワーカーやタイマーが残りません）。

不正な DOT は `invalid-diagram`、WASM・描画環境の問題は `renderer-error` として、いずれも `source: "@riebeckite/plugin-graphviz"` 付きで診断します。

各 figure には安定したフックが付きます。

- `class="rb-graphviz"`
- `data-graphviz="rendered" | "pending" | "error"`
- `data-graphviz-engine="dot"`
- `data-graphviz-source="..."`（エスケープ済みの DOT ソース）

## クライアント側の描画

`initGraphvizDiagrams` は `"client"` モード、および `"both"` のビルド失敗時に使います。`options.renderer` か `globalThis.viz` がなければ jsDelivr から `@viz-js/viz` を ES モジュールとして読み込みます。`[data-graphviz="pending"]` の図だけを描画し、成功すると `data-graphviz="rendered"`、失敗すると `data-graphviz="error"` に切り替えます。

## オプション

| 項目 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `render` | `"build" \| "client" \| "both"` | `"build"` | どのタイミングで描画するか |
| `engine` | `"dot" \| "neato" \| "fdp" \| "sfdp" \| "circo" \| "twopi"` | `"dot"` | Graphviz のレイアウトエンジン |
| `caption` | `boolean` | `true` | title または `// caption:` をキャプションとして表示する |
| `fallback` | `boolean` | `true` | 元の DOT 記法を `<details>` に残す |
| `className` | `string` | `"rb-graphviz"` | `<figure>` の基底クラス（子要素は `__canvas` / `__caption` / `__fallback`） |

`render` の値:

- `"build"` — ビルド時に描画。不正な図は診断を出し、`data-graphviz="error"` になります
- `"client"` — ビルド時は描画せず、ブラウザ側でのみ描画します
- `"both"` — ビルドを優先し、失敗したときだけクライアント側へ切り替えます

## CSS フック

- `.rb-graphviz`、`.rb-graphviz__canvas`、`.rb-graphviz__caption`、`.rb-graphviz__fallback`
- `[data-graphviz="pending"]` / `[data-graphviz="error"]` はプレースホルダーを表示
- ダークモードは `html[data-theme="dark"]` / `html.dark` に追従

## 主なエクスポート

- `graphviz(options?)`: プラグインを作成する（`graphvizPlugin` は別名）
- `initGraphvizDiagrams`: クライアント側の描画を初期化する
- 型: `GraphvizOptions`、`GraphvizClientOptions`、`GraphvizRenderMode`、`GraphvizEngine`

## 制限

- クライアント側の描画は jsDelivr の CDN から `@viz-js/viz` を読み込みます。オフラインで描画するには `renderer` を注入してください。
- HTML ライクなラベル（`label=<...>`）は Graphviz が対応しますが、生成された SVG のサニタイズは行いません。
- キャプションはコードブロックの title、または先頭の `// caption: ...` コメントから取得します。

## 関連資料

- [プラグインシステム](../../../docs/ja/docs/reference/plugin-api.md)

