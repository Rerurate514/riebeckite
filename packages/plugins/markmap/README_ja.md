# @riebeckite/plugin-markmap

` ```markmap ` コードブロックを、Markdown の見出しから組み立てるマインドマップとして表示するプラグインです。マインドマップはブラウザ側で `markmap-lib` と `markmap-view` により描画し、これらのライブラリは図があるときだけ CDN から読み込みます。

[English](./README.md)

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { markmap } from "@riebeckite/plugin-markmap";

export default defineConfig({
  // ...
  plugins: [
    markmap({
      caption: true,
      height: 320,
      fallback: true,
    }),
  ],
});
```

このプラグインは `order: -10` で実行されます。

## 記法

コードブロックの本文は通常の Markdown です。見出しがノードになり、見出しの階層が木構造になります。見出し以外の内容は無視します。

````markdown
```markmap
# プロジェクト

## 設計

### 記法
### 描画

## リリース
```
````

キャプションにはコードブロックの `title` を使います。

## どのように描画されるか

` ```markmap ` のコードブロックは `figure.rb-markmap` に置き換わります。

- `figure.rb-markmap`: `data-markmap="pending"`、`data-markmap-source`（元の Markdown）、`data-markmap-height` を持ちます
- `div.rb-markmap__canvas`: SVG を描画する領域（`role="img"`）
- `figcaption.rb-markmap__caption`: キャプション（既定で有効）
- `details.rb-markmap__fallback`: 元の Markdown を折りたたんで表示

`initMarkmap` は `[data-markmap="pending"]` を探し、ランタイムを読み込んでから `markmap-lib` の `Transformer` を `data-markmap-source` に適用し、得られた木を `markmap-view` の `Markmap.create` で描画します。描画に成功すると `data-markmap="rendered"` になります。

ランタイムの読み込み、ソースの変換、描画のいずれかが失敗した場合は例外を投げず、その figure の `details` を開いて元の Markdown を見せます（`data-markmap="error"`）。

Markdown の見出しを 1 つも含まないコードブロックは置き換えず、通常のコードブロックのまま残し、`source: "@riebeckite/plugin-markmap"` を持つ診断を出します。

## オプション

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| `caption` | `true` | コードブロックの `title` をキャプションとして表示する |
| `height` | `320` | キャンバスの高さ（ピクセル） |
| `className` | `"rb-markmap"` | figure に付ける基準クラス |
| `language` | `"markmap"` | 対象にするコードブロックの言語 |
| `fallback` | `true` | 元の Markdown を表示する `details` を描画する |
| `colorFreezeLevel` | — | ノードの色を固定する深さ |

## クライアント側の描画

クライアントの初期化コードは静的なので、プラグインのオプションは受け取りません。`height` と `colorFreezeLevel` は figure の `data-markmap-*` 属性に埋め込まれ、`initMarkmap` がそこから読み取ります。

`markmap-lib` と `markmap-view` は計算された import 指定子で jsDelivr から取得するため、ホストのクライアントバンドルには含まれません。`markmap-view` は依存として `d3` を読み込みます。ライブラリを遅延して読み込むので、JavaScript を無効にしていてもページは表示され、元の Markdown はフォールバックの `details` から読めます。

## 入力記法の継ぎ目（notation seam）

コードブロックの本文は、`src/parse.ts` にある単一の純粋関数でマインドマップの木に変換します。

```ts
parseMarkmapSource(source: string): MarkmapNode | null
```

`MarkmapNode` は記法に依存しない木（`{ content, children, payload? }`）です。現在は標準の Markdown 見出し記法だけを実装しています。将来別の入力記法（たとえば "ExcaliMindMap" 風のアウトライン）を追加するときは、同じ `MarkmapNode` を返すパーサーを実装するだけです。figure の生成と描画の経路は記法を解析しないため、変更する必要はありません。`parseMarkmapSource` はそのためにパッケージのエントリーポイントから公開しています。

## 出力のフック

- `figure[data-markmap]`: 状態（`pending` / `rendered` / `error`）
- `figure[data-markmap-source]`: 元の Markdown
- `figure[data-markmap-height]`、`figure[data-markmap-color-freeze-level]`
- `[data-markmap-canvas]`: 描画先の要素
- `details.rb-markmap__fallback`: 元の Markdown

## 主なエクスポート

- `markmap(options?)`: プラグインを作成する（`markmapPlugin` は別名）
- `initMarkmap`: クライアント側の描画を初期化する
- `parseMarkmapSource`: 標準記法を木に変換する
- `describeMarkmapTree`: 木からアクセシブルなラベルを作る
- 型: `MarkmapOptions`、`MarkmapNode`、`MarkmapClientOptions`

## 制限

- 描画はクライアント側のみです。ビルド時に何も生成しないため、JavaScript が無効な環境ではマインドマップは表示されません（元の Markdown はフォールバックの `details` に残ります）
- クライアントは初回描画時に `markmap-lib`、`markmap-view` とその CDN サブモジュールを取得するため、最初の描画はネットワーク待ちになります
- 標準記法が対応する Markdown 拡張は限られます。パーサーは ATX（`#`）見出しを認識し、コードフェンス内は無視します
- `markmap-lib` と `markmap-view` は MIT ライセンスです

## 関連資料

- [プラグインシステム](../../../docs/ja/plugin-system.md)
