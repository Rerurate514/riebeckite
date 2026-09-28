# @riebeckite/plugin-marp

`marp` コードブロックを Marp のスライドデッキとしてビルド時に描画するプラグインです。

[English](./README.md)

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { marp } from "@riebeckite/plugin-marp";

export default defineConfig({
  // ...
  plugins: [
    marp({
      theme: "default",
      allowHtml: true,
      math: true,
      caption: true,
    }),
  ],
});
```

ノートでは、情報文字列に `marp` を付けたコードブロックを書きます。スライドの区切りは Marp と同じく `---` です。コードブロックの `title` を付けるとキャプションになります。

````markdown
```marp title="導入スライド"
# 1 枚目のスライド

- 箇条書き

---

# 2 枚目のスライド
```
````

## どのように描画されるか

`@marp-team/marp-core` をビルド時に動的 import して `Marp#render` を呼び出します。Marp Core はクライアントバンドルには含まれません。1 つのコードブロックは次の HTML に置き換わります。

```html
<figure class="rb-marp" role="group" data-marp data-marp-slides="2">
  <style>/* ビルド時に生成し、.rb-marp 配下へスコープした CSS */</style>
  <figcaption class="rb-marp__caption">…</figcaption>
  <div class="rb-marp__deck">
    <svg data-marpit-svg>…</svg>
    …
  </div>
  <details class="rb-marp__fallback">
    <summary>Marp source</summary>
    <pre><code>…元の Markdown…</code></pre>
  </details>
</figure>
```

### 生成 CSS のスコープとインライン化

プラグインは `<head>` へ注入できないため、Marp が生成した CSS は `<figure class="rb-marp">` の中へ `<style>` 要素としてインライン展開します。漏れを防ぐため次の処理を行います。

- Marp の `container` オプションでデッキのコンテナクラスを `rb-marp__deck` に固定し、生成 CSS の全セレクタがそのコンテナ配下に来るようにする
- コンテナセレクタを `.rb-marp` の子孫に限定する（例: `.rb-marp div.rb-marp__deck > svg > foreignObject > section`）
- グローバルに漏れる `@page` ルールを削除し、`@media print` 内の `html, body` を `.rb-marp` に置き換える

同じテーマのデッキが 1 ページに複数ある場合、生成 CSS が同一になるため `<style>` は 1 回だけ出力します。

### ビルド時のレンダリング

- `script: false` でレンダリングするため、デッキにクライアントスクリプトは含まれません。SVG スライドのサイズは `style.css` 側で調整します
- キャプションはコードブロックの `title` から取得します
- `data-marp-slides` にスライド枚数、`data-marp` にデッキであることを示す属性を付けます

## オプション

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| `theme` | `"default"` | Marp Core に登録済みのテーマ名（`"default"`、`"gaia"`、`"uncover"` など） |
| `allowHtml` | `true` | Marp Markdown 内の生 HTML を許可する |
| `math` | `true` | Marp の数式サポートを有効にする |
| `inlineSVG` | 未指定 | Marp の `inlineSVG` オプション。未指定なら SVG スライドを出力する |
| `caption` | `true` | コードブロックの `title` をキャプションとして表示する |
| `className` | `"rb-marp"` | ラッパー要素のクラス名 |

存在しないテーマを指定した場合は既定テーマへフォールバックし、`@riebeckite/plugin-marp` を `source` とする診断を出します。描画自体に失敗した場合は元のコードブロックを残し、同じく診断を出します。

## 制約

- クライアント側でのスライド編集やページ送り UI は提供しません。ビルド時に静的な HTML/CSS を生成するだけです
- 利用できるテーマは Marp Core に登録済みのものに限られます。任意のテーマ CSS の読み込みには対応していません
- `inlineSVG: false` を指定すると SVG ラッパーなしの `<section>` を出力します。生成 CSS もその構造に合わせて変わります

## 主なエクスポート

- `marp(options?)` / `marpPlugin(options?)`: プラグインを作成する
- 型: `MarpOptions`、`MarpDeck`、`MarpBuildRenderResult`

## 関連資料

- [プラグインシステム](../../../docs/ja/plugin-system.md)
