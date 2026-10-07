# @riebeckite/plugin-marp

Marp のスライドデッキをビルド時に描画するプラグインです。YAML frontmatter に `marp: true` を含むノートは文書全体をデッキとして描画し、`marp` コードブロックはインラインデッキとして描画します。

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

## Obsidian Vault との互換性

Obsidian プラグインの [Marp](https://github.com/jichoup/obsidian-marp-plugin) と [Marp Slides](https://github.com/samuele-cozzi/obsidian-marp-slides) はノート全体を Marp デッキとして扱い、`marp` コードフェンスを保存しません。Obsidian 側のアクティベーションはプラグイン単位です。スライドプレビューを開いたり、エクスポートしたりすると、アクティブなノートのファイル全体をデッキとして描画し、ノート単位のマーカーは読みません。Riebeckite では代わりに、文書単位で Marp CLI や VS Code 拡張と同じ canonical なフラグ（frontmatter の `marp: true`）によってデッキ化します。これらのプラグインで書いたノートは次のように検出されます。

````markdown
---
marp: true
theme: gaia
paginate: true
---

# 1 枚目のスライド

---

# 2 枚目のスライド
````

文書全体（directive として `theme` や `paginate` を効かせるため frontmatter を含む）を、ページ本文を置き換える 1 つの `<figure class="rb-marp">` デッキとして描画します。スライドの区切りは Marp と同じく `---` / `===` です。フラグも `marp` コードブロックもないノートは変更しません。

> **アクティベーションの契約.** Riebeckite は Obsidian プラグインと同じ方法ではアクティベートされません。Obsidian でスライドとして表示されていたノート（プレビューを開いたノート）も、frontmatter に `marp: true` がなければここではデッキとして描画されません。そのような Vault に必要な変更はこの 1 行の追加だけです。デッキの本体（セパレータ、`theme` / `paginate` などの directive、標準 Marp 構文）は保存された内容をそのまま使います。つまり、出力は Marp の意味論に従いますが、プラグインの設定不要なプラグインレベルでのアクティベーションは再現しません。完全なドロップイン互換ではなく「コンテンツ互換」として扱ってください。

## インラインデッキ

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

- [プラグインシステム](../../../docs/docs/reference/plugin-api.md)

