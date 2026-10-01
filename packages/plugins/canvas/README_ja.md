# @riebeckite/plugin-canvas

Obsidian の `.canvas`（JSON Canvas 1.0）を図として表示するプラグインです。

[English](./README.md)

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { canvas } from "@riebeckite/plugin-canvas";

export default defineConfig({
  // ...
  plugins: [canvas({ render: "both" })],
});
```

このプラグインは `order: -15` で実行されます。`obsidian-markdown` の後に読み込まれます。

## 入力できるもの

1. ` ```canvas ` フェンスの本文に JSON Canvas を直接書く
2. ` ```canvas ` フェンスの本文に `![[diagram.canvas]]` または `[[diagram.canvas]]` と書き、ファイルを `contentSource` から読む
3. `![[diagram.canvas]]` を本文に直接埋め込む（添付ファイルとして解決）

`.canvas` が見つからない、または JSON Canvas として解釈できない場合はコードブロックをそのまま残し、`@riebeckite/plugin-canvas` を source とするメッセージを報告します。

## どのように描画されるか

`div.rb-canvas` を出力します。属性は `data-canvas`（入力元）、`data-canvas-nodes`、`data-canvas-edges`、`data-canvas-render`（`static` / `client` / `both` / 描画後の `ready`）です。内部には次を置きます。

- `script[type="application/json"][data-canvas-payload]` — エスケープ済みの JSON Canvas。実行されません
- `div.rb-canvas__static` — `render` が `"static"` または `"both"` のときの静的フォールバック。絶対配置したノードカードと SVG のエッジ
- `div.rb-canvas__stage` — `render` が `"client"` または `"both"` のときの空の領域。`initCanvas()` が内容を充填します
- `details.rb-canvas__fallback` — ノードとエッジの一覧（JS なしでも内容を確認できます）

`file` ノードは `contentIndex` から解決し、ノートはパーマリンクへ、それ以外は添付 URL へリンクします。解決したノートリンクの `href` は `onManifestCreated` でマニフェストから確定し、`entry.html` と `PostContent.html` の両方を書き換えます。`text` ノードは最小限の Markdown（wikilink とエスケープ）だけを扱います。

## クライアント側

`initCanvas()` は `data-canvas-render` が `client` / `both` の要素を探し、ペイロードからノードとエッジを組み立て、`data-canvas-render="ready"` を設定します。ready になると静的フォールバックは CSS で隠れます。ホイールで拡大縮小、ドラッグで移動できます（pan/zoom-lite）。

## オプション

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| `className` | `"rb-canvas"` | ラッパー要素のクラス名 |
| `language` | `"canvas"` | 対象のコードフェンス言語 |
| `render` | `"both"` | `"static"`、`"client"`、`"both"` のいずれで描画するか |
| `height` | 未設定 | ステージの高さ（px 数値または CSS 長さ） |
| `maxNodes` | 未設定 | 描画するノード数の上限 |

## 主なエクスポート

- `canvas(options?)` / `canvasPlugin` — プラグインを作成する
- `initCanvas()` — クライアント側の描画を初期化する
- `parseCanvas(json)` — JSON Canvas を解析する（純粋関数）
- `buildCanvasLayout(doc)` — 座標を正規化し、エッジを線分に解決する（純粋関数）
- `resolveCanvasOptions(options)` — 既定値を適用する
- 型: `CanvasOptions`、`CanvasRenderMode`、`CanvasDocument`、`CanvasNode`、`CanvasEdge` ほか

## 関連資料

- [プラグインシステム](../../../docs/ja/docs/reference/plugin-api.md)
