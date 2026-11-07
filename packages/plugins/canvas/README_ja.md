# @riebeckite/plugin-canvas

<!-- Generated from docs/docs/plugins/canvas.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Obsidian の `.canvas`（JSON Canvas 1.0）を、パン・ズームできる読み取り専用 Viewer として表示するプラグインです。

[English](./README.md)

## インストール

```sh
npm install @riebeckite/plugin-canvas
```

## 設定

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
2. ` ```canvas ` フェンスの本文に `![diagram.canvas](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/diagram.canvas.ja.md)` または `[diagram.canvas](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/diagram.canvas.ja.md)` と書き、ファイルを `contentSource` から読む
3. `![diagram.canvas](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/diagram.canvas.ja.md)` を本文に直接埋め込む（添付ファイルとして解決）

`.canvas` が見つからない、または JSON Canvas として解釈できない場合はコードブロックをそのまま残し、`@riebeckite/plugin-canvas` を source とするメッセージを報告します。

## 実行例

~~~canvas
{
  "nodes": [
    { "id": "flow", "type": "group", "x": 0, "y": 0, "width": 820, "height": 420, "label": "公開までの流れ", "color": "6" },
    { "id": "idea", "type": "text", "x": 40, "y": 130, "width": 200, "height": 110, "text": "# 記録\n\n**アイデア** を残す", "color": "5" },
    { "id": "plan", "type": "text", "x": 310, "y": 80, "width": 210, "height": 110, "text": "計画にする", "color": "3" },
    { "id": "logo", "type": "file", "x": 310, "y": 240, "width": 210, "height": 120, "file": "assets/riebeckite-logo.png", "color": "4" },
    { "id": "publish", "type": "link", "x": 590, "y": 150, "width": 180, "height": 100, "url": "https://jsoncanvas.org/spec/1.0/", "label": "JSON Canvas 1.0", "color": "2" }
  ],
  "edges": [
    { "id": "idea-plan", "fromNode": "idea", "fromSide": "right", "toNode": "plan", "toSide": "left", "toEnd": "arrow" },
    { "id": "plan-logo", "fromNode": "plan", "fromSide": "bottom", "toNode": "logo", "toSide": "top", "label": "asset" },
    { "id": "plan-publish", "fromNode": "plan", "fromSide": "right", "toNode": "publish", "toSide": "left", "toEnd": "arrow" }
  ]
}
~~~

## Viewer の動作

SSR と操作可能な表示は、同じ位置決め済み World を共有します。クライアントは World を描き直さず引き継ぎ、初期化に成功してからだけ静的表示を隠します。Text カードは見出し、強調、インラインコード、リスト、引用、Wikilink を扱います。File カードはノートへリンクし、画像・音声・動画をプレビューします。Group、プリセット色と HEX 色、Group 背景、エッジラベル、JSON Canvas の既定矢印、JSON 配列の Z 順を表示します。

初期表示は Frame にフィットします。ホイールで上下にパンし、Shift+ホイールで横にパンします。Ctrl/Cmd+ホイールはポインター位置を中心に拡大縮小します。Space または中ボタンを押しながら余白をドラッグするとパンできます。クリック／Shift+クリックで選択し、Shift+余白ドラッグで範囲選択します。`Ctrl/Cmd+A`、`Shift+1`、`Shift+2` は全選択、全体にフィット、選択範囲にフィットです。タッチでは余白の一本指パンと二本指ピンチズームを使えます。ボタンでも拡大縮小、全体表示、選択範囲表示、リセットを行えます。

Viewer は読み取り専用で、`.canvas` ファイルを書き換えません。外部 URL は `http` と `https` のリンクだけを許可し、iframe には埋め込みません。Mermaid、数式、Callout、表、ノート本文プレビューは、現在カード内で未対応です。

## 描画結果

`div.rb-canvas` を出力します。属性は `data-canvas`（入力元）、`data-canvas-nodes`、`data-canvas-edges`、`data-canvas-render`（`static` / `client` / `both` / 描画後の `ready`）です。内部には次を置きます。

- `data-canvas-payload`：エスケープ済み JSON Canvas の属性です。実行されません
- `div.rb-canvas__static`：絶対配置したノードカードと SVG エッジによる JavaScript なしのフォールバック。クライアント拡張を有効にしても出力します
- `div.rb-canvas__stage`：`render` が `"client"` または `"both"` のとき、`initCanvas()` がサーバー側の World を引き継ぐ領域
- `details.rb-canvas__fallback`：ノードとエッジの一覧（JavaScript なしでも内容を確認できます）

`file` ノードは `contentIndex` から解決し、ノートはパーマリンクへ、それ以外は添付 URL へリンクします。`file` ノードの `subpath` は、対象ノートの見出しかブロックアンカーへ解決します。解決したノートリンクの `href` は `onManifestCreated` でマニフェストから確定し、マニフェストエントリの HTML を書き換えます。Core がその HTML をコンテンツルートの描画 HTML と同期します。`text` ノードの Markdown は意図的に限定しており、サイト全体の Markdown パイプラインではありません。ノート本文プレビューは出力しません。現状の Renderer には参照先ノートの公開可否が渡らないため、出力すると非公開コンテンツを露出させるおそれがあります。

## クライアント側

`initCanvas()` は `data-canvas-render` が `client` / `both` の要素を探し、サーバー側で位置決めしたノードと SVG エッジを引き継いでから `data-canvas-render="ready"` を設定します。ready になるまで静的レイヤーは CSS で隠しません。カメラ変換は `requestAnimationFrame` でまとめ、リンク、テキスト選択、メディア、操作ボタンはそのまま使えます。

## 独立ページ

公開ルーティングされたノートから参照されている `.canvas` は、それ自身のページとしても配信できます。既定では無効で、明示的に有効化します。

```ts
canvas({ documentPages: true })
```

- `drawings/Architecture.canvas` → `/drawings/Architecture`
- `diagrams/System.canvas` → `/diagrams/System`

ページタイプ（`canvas-document`）は、公開エントリが埋め込んでいる Canvas を列挙し、URL を作るときに `.canvas` 拡張子を外します。埋め込み時と同じ `renderCanvas` の出力と `initCanvas` クライアントを再利用します。ページ本文には専用の `<main>` と `<h1>` を持たせます。

公開されるのは、公開ルーティングされたエントリからたどれる Canvas だけです。下書き・公開予定・その他非公開のノートからしか参照されていない Canvas は公開しません。Canvas 内のノートリンクが非公開ノートを指す場合は `#` に置き換えます。同じ URL を Markdown ページやリダイレクトが既に持っている場合は Markdown を優先し、Canvas ページは `canvas-page-conflict` を報告して生成しません。

独立ページはグローバルな出力依存（`global`）を宣言します。Canvas の追加・改名・編集・削除や、参照するノートの変更で、影響する出力を無効化します。

## オプション

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| `className` | `"rb-canvas"` | ラッパー要素のクラス名 |
| `language` | `"canvas"` | 対象のコードフェンス言語 |
| `render` | `"both"` | `"static"`、`"client"`、`"both"` のいずれで描画するか |
| `height` | 未設定 | ステージの高さ（px 数値または CSS 長さ） |
| `maxNodes` | 未設定 | 描画するノード数の上限 |
| `documentPages` | `false` | 参照されている Canvas を独立ページとして配信する |

## 主なエクスポート

- `canvas(options?)` / `canvas`：プラグインを作成する
- `initCanvas()`：クライアント側の描画を初期化する
- `parseCanvas(json)`：JSON Canvas を解析する（純粋関数）
- `buildCanvasLayout(doc)`：座標を正規化し、エッジを線分に解決する（純粋関数）
- `resolveCanvasOptions(options)`：既定値を適用する
- 型: `CanvasOptions`、`CanvasRenderMode`、`CanvasDocument`、`CanvasNode`、`CanvasEdge` ほか

## 関連資料

- [プラグインシステム](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
